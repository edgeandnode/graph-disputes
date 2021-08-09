import logging

from starlette.requests import Request
from fastapi import APIRouter, File, UploadFile, HTTPException

from ..dispute.fsm import create_resolver

router = APIRouter()

logger = logging.getLogger(__name__)


@router.post("/upload-poi")
async def upload_poi_to_gcloud(request: Request, file: UploadFile = File(...)):
    """
    Stream a bit stream into gcloud
    """
    indexer_node = request.headers["indexer-node"]
    dispute_hash = request.headers["dispute-hash"]

    resolver = await create_resolver(dispute_hash, indexer_node)
    stage = await resolver.get_stage()

    if not stage:
        logger.info("This dispute does not exist")
        raise HTTPException(status_code=404, detail="Dispute not found")

    logger.info(
        "Uploading file {} for indexer {} for dispute {}".format(
            file.filename, indexer_node, dispute_hash
        )
    )
    content = await file.read()

    try:
        result = await resolver.indexer_add_poi(content, file.filename)
    except Exception as e:
        raise HTTPException(status_code=500, detail="{}".format(e))

    return result


@router.post("/upload-entities")
async def upload_poi_to_gcloud(request: Request, file: UploadFile = File(...)):
    """
    Stream a bit stream into gcloud
    """
    indexer_node = request.headers["indexer-node"]
    dispute_hash = request.headers["dispute-hash"]

    resolver = await create_resolver(dispute_hash, indexer_node)

    logger.info(
        "Uploading file {} for indexer {} for dispute {}".format(
            file.filename, indexer_node, dispute_hash
        )
    )
    content = await file.read()

    try:
        result = await resolver.indexer_add_entities(content, file.filename)
    except Exception as e:
        raise HTTPException(status_code=500, detail="{}".format(e))

    return result


def init_app(app):
    app.include_router(router)
