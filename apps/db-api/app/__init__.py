from collections.abc import AsyncGenerator

from litestar import Litestar
from litestar.plugins.sqlalchemy import SQLAlchemyAsyncConfig, SQLAlchemyInitPlugin
from litestar.plugins.structlog import StructlogPlugin
from litestar.stores.memory import MemoryStore
from litestar_granian import GranianPlugin
from sqlalchemy.ext.asyncio import AsyncSession

from .api import api_router
from .api.problem_details import problem_details_plugin
from .api.schemas import JSONNull, bigint, bigint_enc_hook, jsonnull_enc_hook
from .config import cors_config, csrf_config, log_config
from .database import async_engine, do_init_db
from .meili import meilisearch_client
from .oauth import callback, keycloak_client, login, session_auth
from .openapi import openapi_config


async def provide_transaction(
    db_session: AsyncSession,
) -> AsyncGenerator[AsyncSession, None]:
    async with db_session.begin():
        yield db_session


def create_app() -> Litestar:
    alchemy_config = SQLAlchemyAsyncConfig(engine_instance=async_engine)

    return Litestar(
        cors_config=cors_config,
        csrf_config=csrf_config,
        dependencies={'transaction': provide_transaction},
        openapi_config=openapi_config,
        plugins=[
            problem_details_plugin,
            SQLAlchemyInitPlugin(alchemy_config),
            StructlogPlugin(config=log_config),
            GranianPlugin(),
        ],
        stores={'sessions': MemoryStore()},
        on_app_init=[session_auth.on_app_init],
        on_startup=[do_init_db],
        lifespan=[meilisearch_client, keycloak_client],
        type_encoders={JSONNull: jsonnull_enc_hook, bigint: bigint_enc_hook},
        route_handlers=[api_router, callback, login],
    )
