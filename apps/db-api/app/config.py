import concurrent.futures
import logging
import os
import sys
from dataclasses import dataclass
from io import StringIO

import litestar.concurrency
import litestar.middleware
import litestar.routes
import structlog
from dotenv import load_dotenv
from litestar.exceptions import ClientException
from litestar.logging.config import (
    LoggingConfig,
    StructlogEventFilter,
    StructLoggingConfig,
)
from litestar.middleware.logging import LoggingMiddlewareConfig
from litestar.plugins.structlog import StructlogConfig
from sqlalchemy import URL

load_dotenv()

DEFAULT_PAGE_SIZE = int(os.getenv('DEFAULT_PAGE_SIZE', 20))
MAX_PAGE_SIZE = int(os.getenv('MAX_PAGE_SIZE', 1000))

POSTGRES_DB = os.getenv('POSTGRES_DB')
POSTGRES_PORT = os.getenv('POSTGRES_PORT')
POSTGRES_USER = os.getenv('POSTGRES_USER')
POSTGRES_PASSWORD = os.getenv('POSTGRES_PASSWORD')
POSTGRES_SERVER = os.getenv('POSTGRES_SERVER')
SQLALCHEMY_DATABASE_URI = URL.create(
    'postgresql+asyncpg',
    username=POSTGRES_USER,
    password=POSTGRES_PASSWORD,
    host=POSTGRES_SERVER,
    port=POSTGRES_PORT,
    database=POSTGRES_DB,
)
SQLALCHEMY_DATABASE_URI_SYNC = URL.create(
    'postgresql+psycopg',
    username=POSTGRES_USER,
    password=POSTGRES_PASSWORD,
    host=POSTGRES_SERVER,
    port=POSTGRES_PORT,
    database=POSTGRES_DB,
)

MEILI_URL = os.getenv('MEILI_URL', 'http://meili:7700')
MEILI_MASTER_KEY = os.getenv('MEILI_MASTER_KEY')


def remove_module_pathname_add_logger(
    _, __, event_dict: structlog.typing.EventDict
) -> structlog.typing.EventDict:
    """Removes 'module' and 'pathname' from the `event_dict` and adds
    `logger = 'litestar'` if the event comes from Litestar, otherwise
    adds `logger = module`.

    This is our workaround to `structlog.stdlib.add_logger_name` not
    working with `WriteLoggerFactory` (Litestar's default logger
    factory). We can't use that processor because `WriteLogger` doesn't
    have a `name` field.
    """
    module = event_dict.pop('module')
    pathname = event_dict.pop('pathname')
    if pathname is not None:
        if 'litestar' in pathname:
            event_dict['logger'] = 'litestar'
            event_dict.pop('filename')
            event_dict.pop('func_name')
        elif module is not None:
            event_dict['logger'] = module
    return event_dict


def hide_client_exception_trace(_, __, event_dict: structlog.typing.EventDict):
    """Processor to hide traceback for `ClientException`."""
    # We want to always log exceptions, but Litestar's approach to raising
    # 4xx status codes is by raising an exception. Traceback for these
    # errors aren't interesting because we expect them.
    if event_dict.get('exc_info', False) != False and isinstance(
        sys.exception(), ClientException
    ):
        event_dict.pop('exc_info')
        # ClientException.__str__ without extra args is
        # "{status_code}: {detail}"
        # We're already using structured logging, so we store those values as
        # separate keys instead of just one str(sys.exception()) value.
        if 'status_code' not in event_dict:
            event_dict['status_code'] = sys.exception().status_code
        if 'detail' not in event_dict:
            event_dict['detail'] = str(sys.exception().detail)
    return event_dict


shared_processors = [
    structlog.contextvars.merge_contextvars,
    hide_client_exception_trace,
    structlog.stdlib.add_log_level,
    structlog.processors.TimeStamper(fmt='iso'),
    # Don't think ExtraAdder() has any effect for either structlog or stdlib,
    # but Litestar's default stdlib processors uses it, so whatever
    structlog.stdlib.ExtraAdder(),
    # Hide 'message' since it pointlessly repeats the message.
    # Litestar's default stdlib processors hides 'color_message'
    StructlogEventFilter(['color_message', 'message']),
]


@dataclass
class CustomColumnFormatter:
    """Formatter to use different colors for HTTP status codes."""

    def __call__(self, key: str, value: object) -> str:
        sio = StringIO()

        key_style = structlog.dev.CYAN
        reset_style = structlog.dev.RESET_ALL
        value_style = structlog.dev.MAGENTA
        if key == 'status_code':
            if 200 <= value <= 299:
                value_style = structlog.dev.GREEN
            elif 300 <= value <= 399:
                value_style = structlog.dev.YELLOW
            elif 400 <= value <= 599:
                value_style = structlog.dev.RED

        sio.write(key_style)
        sio.write(key)
        sio.write(reset_style)
        sio.write('=')
        sio.write(value_style)
        sio.write(str(value))
        sio.write(reset_style)
        return sio.getvalue()


console_renderer = structlog.dev.ConsoleRenderer(
    colors=True,
    # Exceptions in application code like `1/0` use this formatter, regardless
    # if we imported structlog or stdlib logging for getLogger.
    exception_formatter=structlog.dev.RichTracebackFormatter(
        # Rich's Traceback defines max_frames as max(4, max_frames), so we
        # always have at least 4 frames.
        # This is annoying with show_locals since the early frames are Litestar
        # frames with a lot of large local objects. My workaround is to suppress
        # the traceback of the Litestar exceptions (you still see the function
        # names in the error, just not the code block and locals).
        max_frames=4,
        show_locals=True,
        suppress=[
            litestar.middleware,
            litestar.routes,
            litestar.concurrency,
            concurrent.futures,
        ],
        width=80,
    ),
)
console_renderer._default_column_formatter = CustomColumnFormatter()


log_config = StructlogConfig(
    structlog_logging_config=StructLoggingConfig(
        log_exceptions='always',
        # `processors` only applies for structlog, not stdlib logging
        processors=shared_processors
        + [
            structlog.processors.CallsiteParameterAdder(
                [
                    structlog.processors.CallsiteParameter.FILENAME,
                    structlog.processors.CallsiteParameter.FUNC_NAME,
                    structlog.processors.CallsiteParameter.MODULE,
                    structlog.processors.CallsiteParameter.PATHNAME,
                ]
            ),
            # Delete 'module' and 'pathname' and add 'logger'.
            # We can't use structlog.stdlib.add_logger_name because the default
            # logger factory (WriteLoggerFactory) nor PrintLoggerFactory have
            # a `name` field.
            # Setting logger_factory to LoggerFactory() will make the structlog
            # log message (already formatted) be logged again by stdlib as the
            # `message` value, so we'll stick with WriteLoggerFactory which
            # hasn't caused any problems so far.
            remove_module_pathname_add_logger,
            console_renderer,
        ],
        # The log level set on the root logger doesn't affect structlog logs
        # since structlog is not passing the logs to stdlib logging. We
        # need to create a bound logger and use the same level as the root
        # logger below.
        # https://github.com/litestar-org/litestar/issues/3424
        wrapper_class=structlog.make_filtering_bound_logger(
            int(os.getenv('LOG_LEVEL', logging.INFO))
        ),
        # Was running into `TypeError: can only concatenate str (not "bytes") to
        # str` upon test startup. The problem is we use ConsoleRenderer which is
        # using strings while the default logger factory uses bytes. Workaround
        # is to use a logger factory that uses strings.
        # https://github.com/litestar-org/litestar/issues/2151
        logger_factory=structlog.PrintLoggerFactory(),
        # This config only affects the logs using stdlib logging
        standard_lib_logging_config=LoggingConfig(
            root={
                'level': int(os.getenv('LOG_LEVEL', logging.INFO)),
                'handlers': ['queue_listener'],
            },
            formatters={
                'standard': {
                    '()': structlog.stdlib.ProcessorFormatter,
                    'foreign_pre_chain': shared_processors,
                    'processors': [
                        # We can use add_logger_name since stdlib logging is not
                        # using WriteLoggerFactory
                        structlog.stdlib.add_logger_name,
                        structlog.stdlib.ProcessorFormatter.remove_processors_meta,
                        structlog.dev.ConsoleRenderer(
                            # Note: for debugging, colors=False is good for
                            # seeing what came from structlog and what came from
                            # stdlib logger
                            colors=True,
                            # Reasons above don't apply here since Litestar logs
                            # don't go through stdlib logging. I still use
                            # show_locals=True in case it may be helpful.
                            exception_formatter=structlog.dev.RichTracebackFormatter(
                                max_frames=4, show_locals=True, width=80
                            ),
                        ),
                    ],
                }
            },
            loggers={
                # Granian (and uvicorn) logs are pretty much the same as
                # Litestar's middleware, except that the middleware splits the
                # request and response, so it's possible to not know which request
                # a response is for. If you enable Granian access logs though,
                # they will be outputted with the same time as the Litestar
                # response logs.
                '_granian': {
                    'propagate': False,
                    'level': int(os.getenv('GRANIAN_GENERIC_LEVEL', logging.INFO)),
                    'handlers': ['queue_listener'],
                },
                # GRANIAN_LOG_ACCESS_FMT is meant for formatting the string that
                # gets logged, not for the actual log format which is just `%(message)s`,
                # so you want to mess with that env var or pass it in --access-log-fmt
                # %(addr)s - "%(method)s %(path)s %(protocol)s %(status)d %(dt_ms).3f"
                'granian.access': {
                    'propagate': False,
                    'level': int(os.getenv('GRANIAN_ACCESS_LEVEL', logging.INFO)),
                    'handlers': ['queue_listener'],
                },
                'sqlalchemy.engine': {
                    'propagate': False,
                    # logging.INFO is equivalent to echo=True on create_engine.echo
                    'level': int(os.getenv('SQLALCHEMY_ENGINE_LEVEL', logging.WARN)),
                    'handlers': ['queue_listener'],
                },
                'sqlalchemy.pool': {
                    'propagate': False,
                    # logging.INFO is equivalent to pool_echo=True on
                    # create_engine.pool_echo
                    'level': int(os.getenv('SQLALCHEMY_POOL_LEVEL', logging.WARN)),
                    'handlers': ['queue_listener'],
                },
                'alembic': {
                    'propagate': False,
                    'level': int(os.getenv('ALEMBIC_LOG_LEVEL', logging.INFO)),
                    'handlers': ['queue_listener'],
                },
            },
        ),
    ),
    middleware_logging_config=LoggingMiddlewareConfig(
        request_log_fields=['method', 'path', 'query', 'client'],
        response_log_fields=['status_code'],
        request_cookies_to_obfuscate={'session', 'XSRF-TOKEN'},
        request_headers_to_obfuscate={
            'Authorization',
            'X-API-KEY',
            'X-XSRF-TOKEN',
            'cookie',
        },
    ),
)
