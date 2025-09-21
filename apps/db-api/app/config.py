import os

from dotenv import load_dotenv
from sqlalchemy import URL

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
SQLALCHEMY_DATABASE_URI_SYNC = URL.create(
    'postgresql+psycopg',
    username=POSTGRES_USER,
    password=POSTGRES_PASSWORD,
    host=POSTGRES_SERVER,
    port=POSTGRES_PORT,
    database=POSTGRES_DB,
)
