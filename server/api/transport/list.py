import logging
from fastapi import APIRouter
from starlette.requests import Request
from ..storage.gcloud import GCLOUD_CLIENT, list_objects

router = APIRouter()

logger = logging.getLogger(__name__)


@router.get("/list_objects")
async def list_buckets(request: Request):
    """
    List all relevant poi buckets
    """

    data = await list_objects()
    return data


@router.get("/list_buckets")
async def list_buckets(request: Request):
    """
    List all relevant poi buckets
    """

    buckets = GCLOUD_CLIENT.list_buckets()

    bucket_names = [b.name for b in buckets]

    return {"buckets": bucket_names}


def init_app(app):
    app.include_router(router)
