import logging
from fastapi import APIRouter
from starlette.requests import Request
from ..storage.gcloud import list_objects

router = APIRouter()

logger = logging.getLogger(__name__)


@router.get("/list_objects")
async def list_buckets(request: Request):
    """
    List all relevant poi buckets
    """

    data = await list_objects()
    return data


def init_app(app):
    app.include_router(router)
