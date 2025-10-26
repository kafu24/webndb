from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager
from typing import Any

import msgspec
import structlog
from litestar import Litestar
from litestar.exceptions import ClientException, InternalServerException
from meilisearch_python_sdk import AsyncClient
from meilisearch_python_sdk.errors import (
    MeilisearchApiError,
    MeilisearchCommunicationError,
)
from meilisearch_python_sdk.json_handler import _JsonHandler

from .config import MEILI_MASTER_KEY, MEILI_URL

logger = structlog.stdlib.get_logger()


class MsgspecMeiliJsonHandler(_JsonHandler):
    encoder = msgspec.json.Encoder()
    decoder = msgspec.json.Decoder()

    @staticmethod
    def dumps(obj: Any) -> str:
        return MsgspecMeiliJsonHandler.encoder.encode(obj).decode()

    @staticmethod
    def loads(json_string: str | bytes | bytearray) -> Any:
        return MsgspecMeiliJsonHandler.decoder.decode(json_string)


@asynccontextmanager
async def meilisearch_client(app: Litestar) -> AsyncGenerator[None, None]:
    meili_client = getattr(app.state, 'meili_client', None)
    if meili_client is None:
        meili_client = AsyncClient(
            MEILI_URL, MEILI_MASTER_KEY, json_handler=MsgspecMeiliJsonHandler
        )
        app.state.meili_client = meili_client

    try:
        health = await meili_client.health()
        if health.status != 'available':
            logger.error('Meilisearch server is not available')
            raise InternalServerException
    except MeilisearchCommunicationError as e:
        logger.error('Meilisearch communication error')
        raise InternalServerException

    try:
        yield
    finally:
        await meili_client.aclose()


def format_meili_api_error(e: MeilisearchApiError) -> ClientException:
    return ClientException(e.message.lstrip('Error message: '))
