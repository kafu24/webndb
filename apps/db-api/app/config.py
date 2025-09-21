import os

from dotenv import load_dotenv
from litestar.plugins.sqlalchemy import SQLAlchemyAsyncConfig
from sqlalchemy import URL

from .models import Base

load_dotenv()

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
alchemy_config = SQLAlchemyAsyncConfig(
    connection_string=SQLALCHEMY_DATABASE_URI, metadata=Base.metadata, create_all=True
)
