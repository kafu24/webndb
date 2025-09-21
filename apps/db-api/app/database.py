import pathlib

from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine, inspect
from sqlalchemy.ext.asyncio import create_async_engine

from .config import SQLALCHEMY_DATABASE_URI, SQLALCHEMY_DATABASE_URI_SYNC
from .models import Base

engine = create_engine(SQLALCHEMY_DATABASE_URI_SYNC)
async_engine = create_async_engine(SQLALCHEMY_DATABASE_URI)


def do_init_db():
    with engine.begin() as connection:
        if inspect(connection).has_table('alembic_versions'):
            # TODO: log a message telling users to use `litestar database upgrade`
            pass
        else:
            # TODO: log a message
            Base.metadata.create_all(bind=connection)
            alembic_cfg = Config(
                f'{pathlib.Path(__file__).parent.resolve().parent}/alembic.ini'
            )
            command.stamp(alembic_cfg, 'head')
