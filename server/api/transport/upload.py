import logging
from typing import Optional
from pydantic import BaseModel
from starlette.requests import Request
from fastapi import APIRouter, File, UploadFile, HTTPException

from ..dispute.fsm import create_resolver

router = APIRouter()

logger = logging.getLogger(__name__)


class IndexerUploadResponse(BaseModel):
    upload_path: Optional[str]


@router.post("/upload-poi", response_model=IndexerUploadResponse)
async def upload_poi_to_gcloud(request: Request, file: UploadFile = File(...)):
    """
    Stream a file of poi into gcloud
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

    return IndexerUploadResponse(upload_path=result)


@router.post("/upload-entities", response_model=IndexerUploadResponse)
async def upload_entities_to_gcloud(request: Request, file: UploadFile = File(...)):
    """
    Stream a file of entitites into gcloud
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

    return IndexerUploadResponse(upload_path=result)


def init_app(app):
    app.include_router(router)
