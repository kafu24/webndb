"""Minimal Litestar application."""

from asyncio import sleep
from collections.abc import AsyncGenerator
from typing import Any

from litestar import Litestar, get
from litestar.plugins.sqlalchemy import SQLAlchemyAsyncConfig, SQLAlchemyInitPlugin
from sqlalchemy.ext.asyncio import AsyncSession

from .database import async_engine, do_init_db


@get('/')
async def async_hello_world() -> dict[str, Any]:
    """Route Handler that outputs hello world."""
    await sleep(0.1)
    return {'hello': 'world'}


@get('/sync', sync_to_thread=False)
def sync_hello_world() -> dict[str, Any]:
    """Route Handler that outputs hello world."""
    return {'hello': 'world'}


async def provide_transaction(
    db_session: AsyncSession,
) -> AsyncGenerator[AsyncSession, None]:
    async with db_session.begin():
        yield db_session


def create_app() -> Litestar:
    alchemy_config = SQLAlchemyAsyncConfig(engine_instance=async_engine)

    return Litestar(
        route_handlers=[sync_hello_world, async_hello_world],
        dependencies={'transaction': provide_transaction},
        plugins=[SQLAlchemyInitPlugin(alchemy_config)],
        on_startup=[do_init_db],
    )
