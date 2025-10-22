from collections.abc import AsyncGenerator

from litestar import Litestar
from litestar.plugins.sqlalchemy import SQLAlchemyAsyncConfig, SQLAlchemyInitPlugin
from litestar.plugins.structlog import StructlogPlugin
from litestar_granian import GranianPlugin
from sqlalchemy.ext.asyncio import AsyncSession

from .config import log_config
from .database import async_engine, do_init_db


async def provide_transaction(
    db_session: AsyncSession,
) -> AsyncGenerator[AsyncSession, None]:
    async with db_session.begin():
        yield db_session


def create_app() -> Litestar:
    alchemy_config = SQLAlchemyAsyncConfig(engine_instance=async_engine)

    return Litestar(
        dependencies={'transaction': provide_transaction},
        plugins=[
            SQLAlchemyInitPlugin(alchemy_config),
            StructlogPlugin(config=log_config),
            GranianPlugin(),
        ],
        on_startup=[do_init_db],
    )
