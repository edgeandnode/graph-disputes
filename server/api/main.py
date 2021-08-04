import os
import time
import string
import random
import logging
from pathlib import Path
from importlib.metadata import entry_points
from starlette.middleware import Middleware
from starlette.requests import Request


from starlette_context import context, plugins
from starlette_context.middleware import ContextMiddleware
from fastapi.middleware.cors import CORSMiddleware

from fastapi import FastAPI
from .models import db

from os import path

origins = ["*"]


# Make this available to the gcloud sdk
os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = str(
    Path(__file__).parent.joinpath("service-key.json")
)

log_file_path = path.join(path.dirname(path.abspath(__file__)), "logging.conf")
logging.config.fileConfig(
    log_file_path,
    disable_existing_loggers=False,
)
logger = logging.getLogger(__name__)


middleware = [
    Middleware(
        ContextMiddleware,
        plugins=(plugins.RequestIdPlugin(), plugins.CorrelationIdPlugin()),
    )
]


def load_modules(app=None):
    for ep in entry_points()["api.modules"]:
        logger.info("Loading module: %s", ep.name)
        mod = ep.load()
        if app:
            init_app = getattr(mod, "init_app", None)
            if init_app:
                init_app(app)


def get_app():
    app = FastAPI(title="Dispute service", middleware=middleware)

    @app.middleware("http")
    async def log_requests(request: Request, call_next):
        """
        Logs every request and returns the time it took to run
        """
        random_request_id = "".join(
            random.choices(string.ascii_uppercase + string.digits, k=6)
        )
        logger.info(
            f"request_id={random_request_id} start request path={request.url.path}"
        )
        start_time = time.time()

        # ipdb.set_trace()
        response = await call_next(request)

        process_time = (time.time() - start_time) * 1000
        formatted_process_time = "{0:.2f}".format(process_time)
        logger.info(
            f"request_id={random_request_id} completed_in={formatted_process_time}ms status_code={response.status_code}"
        )

        return response

    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    db.init_app(app)
    load_modules(app)
    return app
