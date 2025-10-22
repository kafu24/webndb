import pathlib

import structlog
from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine, inspect
from sqlalchemy.ext.asyncio import create_async_engine

from .config import SQLALCHEMY_DATABASE_URI, SQLALCHEMY_DATABASE_URI_SYNC
from .models import Base

logger = structlog.stdlib.get_logger()
engine = create_engine(SQLALCHEMY_DATABASE_URI_SYNC)
async_engine = create_async_engine(SQLALCHEMY_DATABASE_URI)


def do_init_db():
    with engine.begin() as connection:
        if inspect(connection).has_table('alembic_versions'):
            logger.info(
                '`alembic_versions` relation found.'
                ' If needed, upgrade to the latest revision with'
                ' `litestar database upgrade`.'
            )
        else:
            logger.info(
                '`alembic_versions` relation not found.'
                ' Creating tables and stamping head.'
            )
            Base.metadata.create_all(bind=connection)
            alembic_cfg = Config(
                f'{pathlib.Path(__file__).parent.resolve().parent}/alembic.ini'
            )
            command.stamp(alembic_cfg, 'head')
