import logging
import aiohttp
import pandas as pd

from pathlib import Path
from typing import List

from google.cloud.storage.bucket import Bucket

from gcloud.aio.storage import Storage

POI_BUCKET_NAME = "poi-disputes"

##Probably refactor this and pass it around the context?


async def list_objects(bucket_name=POI_BUCKET_NAME):
    """Upload csv files to bucket."""
    async with aiohttp.ClientSession() as session:
        astorage = Storage(session=session)
        results = await astorage.list_objects(bucket_name)
        return results


async def stream_dataframe_to_gcs(
    matching_events: pd.DataFrame, dispute_id: str, bucket_name=POI_BUCKET_NAME
):
    """
    Pushes dataframe to GCS without intermediate file.

    Works by converting dataframe to a csv string and then using blob upload.
    For large dataframes this probably won't work... would need to stream to a file.

    """

    async with aiohttp.ClientSession() as session:
        astorage = Storage(session=session)
        bucket = astorage.get_bucket(bucket_name)
        new_blob = bucket.new_blob("{}/matching_events.csv".format(dispute_id))
        # Any benefit here in defining content type on string data?
        result = await new_blob.upload(matching_events.to_csv())

        return result


async def upload_file(
    file_data, object_name: str, indexer_node: str, dispute_hash: str
):
    """Upload indexer data files to bucket. If any directories don't exist, make them."""
    async with aiohttp.ClientSession() as session:
        astorage = Storage(session=session)

        object_path = "{}/{}/{}".format(dispute_hash, indexer_node, object_name)
        # await get_or_create_bucket(bucket_name)
        bucket = astorage.get_bucket(POI_BUCKET_NAME)
        dispute_exists = await bucket.blob_exists(dispute_hash + "/")
        ## Create the nested directory if it does not yet exist.
        if not dispute_exists:
            logging.info("{} dispute not on gcloud".format(dispute_hash))
            dispute_base = bucket.new_blob("{}/".format(dispute_hash))
            await dispute_base.upload(data=None)

        indexer_dispute_path = "{}/{}/".format(dispute_hash, indexer_node)
        indexer_dispute_exists = await bucket.blob_exists(indexer_dispute_path)

        if not indexer_dispute_exists:
            indexer_dispute_base = bucket.new_blob(indexer_dispute_path)
            await indexer_dispute_base.upload(data=None)

        status = await astorage.upload(
            POI_BUCKET_NAME,
            object_path,
            file_data,
        )

        return (status, object_path)


async def pull_bucket_contents(
    bucket: Bucket, dispute_id: str, indexer_id: str
) -> List[str]:
    """
    Gather all of the contents of a bucket for an indexer id.
    Returns paths to downloaded data.

    Needed for prior to loading data in memory w/ pandas
    """
    folder = "/tmp/dispute/{}/{}".format(dispute_id, indexer_id)
    blobs = bucket.list_blobs()
    uris = []

    if blobs:
        Path(folder).mkdir(parents=True, exist_ok=True)
    for blob in blobs:
        logging.info("Blobs: {}".format(blob.name))
        destination_uri = "/tmp/dispute/{}/{}/{}".format(
            dispute_id, indexer_id, blob.name
        )
        blob.download_to_filename(destination_uri)
        uris.append(destination_uri)
    return uris
