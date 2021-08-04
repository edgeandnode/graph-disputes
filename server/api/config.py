import os
from sqlalchemy.engine.url import URL, make_url
from starlette.config import Config
from starlette.datastructures import Secret

from pathlib import Path

FASTAPI_DEPLOYMENT = os.getenv("FASTAPI_DEPLOYMENT")

if FASTAPI_DEPLOYMENT == "production":
    environment_path = Path.joinpath(Path(__file__).parent, ".env.prod")
elif FASTAPI_DEPLOYMENT == "dev":
    environment_path = Path.joinpath(Path(__file__).parent, ".env")
else:
    environment_path = ""

config = Config(environment_path)


DB_DRIVER = config("DB_DRIVER", default="postgresql")
DB_HOST = config("DB_HOST", default="127.0.0.1")
DB_PORT = config("DB_PORT", cast=int, default=5432)
DB_USER = config("DB_USER", default=None)
DB_PASSWORD = config("DB_PASS", cast=Secret, default="")
DB_DATABASE = config("DB_NAME", default=None)
DB_DSN = config(
    "DB_DSN",
    cast=make_url,
    default=URL(
        drivername=DB_DRIVER,
        username=DB_USER,
        password=DB_PASSWORD,
        host=DB_HOST,
        port=DB_PORT,
        database=DB_DATABASE,
    ),
)
DB_POOL_MIN_SIZE = config("DB_POOL_MIN_SIZE", cast=int, default=1)
DB_POOL_MAX_SIZE = config("DB_POOL_MAX_SIZE", cast=int, default=10)
DB_ECHO = config("DB_ECHO", cast=bool, default=False)
DB_SSL = config("DB_SSL", default=None)
DB_USE_CONNECTION_FOR_REQUEST = config(
    "DB_USE_CONNECTION_FOR_REQUEST", cast=bool, default=True
)
DB_RETRY_LIMIT = config("DB_RETRY_LIMIT", cast=int, default=1)
DB_RETRY_INTERVAL = config("DB_RETRY_INTERVAL", cast=int, default=1)
