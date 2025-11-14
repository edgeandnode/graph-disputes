# Everything in here should probably be run as daemon processes with first class support for web3/ipfs.
import sys
import yaml
import aiohttp
import logging
import greenlet
import pandas as pd
import ipfshttpclient

from typing import Any
from eth_typing import URI

from web3 import Web3


# Inline this. can't shade versions of sqlalchemy
# from sqlalchemy.util.concurrency import await_only

logger = logging.getLogger(__name__)

# Client will be shared.
ipfs = ipfshttpclient.connect("/dns/ipfs.infura.io/tcp/5001/https")


class AsyncIoGreenlet(greenlet.greenlet):
    def __init__(self, driver, fn):
        greenlet.greenlet.__init__(self, fn, driver)
        self.driver = driver


async def green_spawn(fn, *args, **kwargs):
    context = AsyncIoGreenlet(greenlet.getcurrent(), fn)

    result = context.switch(*args, **kwargs)

    while context:
        try:
            value = await result
        except:
            result = context.throw(*sys.exc_info())
        else:
            result = context.switch(value)

    return result


def green_await(awaitable):
    current = greenlet.getcurrent()
    if not isinstance(current, AsyncIoGreenlet):
        raise TypeError("Cannot use green_await outside of green_spawn target")
    return current.driver.switch(awaitable)


async def make_post_request(
    endpoint_uri: URI, data: bytes, *args: Any, **kwargs: Any
) -> bytes:
    kwargs.setdefault("timeout", 10)
    async with aiohttp.ClientSession() as client:
        response = await client.post(endpoint_uri, data=data, *args, **kwargs)  # type: ignore
        response.raise_for_status()
        return await response.content.read()


# IMPLEMENT `await_only`
# class AIOHTTPProvider(Web3.HTTPProvider):
#     def make_request(self, method: RPCEndpoint, params: Any) -> RPCResponse:
#         self.logger.debug(
#             "Making request HTTP. URI: %s, Method: %s", self.endpoint_uri, method
#         )
#         request_data = self.encode_rpc_request(method, params)
#         raw_response = await_only(
#             make_post_request(
#                 self.endpoint_uri, request_data, **self.get_request_kwargs()
#             )
#         )
#         response = self.decode_rpc_response(raw_response)
#         self.logger.debug(
#             "Getting response HTTP. URI: %s, " "Method: %s, Response: %s",
#             self.endpoint_uri,
#             method,
#             response,
#         )
#         return response


##Make these environment variables
ETHEREUM_API_URL = (
    "https://eth-mainnet.alchemyapi.io/v2/mWSH9YlhpXfXymzLxptC1TE2CIy2QuMA"
)

w3 = Web3(Web3.HTTPProvider(ETHEREUM_API_URL))

# w3 = Web3(AIOHTTPProvider(ETHEREUM_API_URL))


class DataSource:
    def __init__(self, address, abi_name, abi, events):
        self.abi_name = abi_name
        self.abi = abi
        self.address = address
        self.events = events


def getSource(data_source):
    address = data_source["source"]["address"]
    abi_name = data_source["source"]["abi"]
    abi_location = list(
        filter(lambda abi: abi["name"] == abi_name, data_source["mapping"]["abis"])
    )[0]["file"]["/"]
    abi = ipfs.cat(abi_location)
    events = data_source["mapping"]["eventHandlers"]
    return DataSource(address, abi_name, abi, events)


def get_matching_events(datasources, divergent_blocks):
    matching_events = pd.DataFrame(
        columns=[
            "address",
            "block",
            "event",
            "subgraph_events",
            "handlers",
            "log_params",
        ]
    )
    for source in datasources:
        address = w3.toChecksumAddress(source.address)
        contract_abi = source.abi.decode("utf-8")
        contract = w3.eth.contract(address=address, abi=contract_abi)
        for block in divergent_blocks:
            logs_filter_params = {
                "fromBlock": block,
                "toBlock": block,
                "address": address,
            }
            logs_filter = w3.eth.filter(logs_filter_params)
            logs = w3.eth.get_filter_logs(logs_filter.filter_id)
            for log in logs:
                for contract_event in contract.events:
                    subgraph_events = list(
                        filter(
                            lambda e: e["event"].split("(")[0]
                            == contract_event.event_name,
                            source.events,
                        )
                    )
                    handlers = [
                        subgraph_event["handler"] for subgraph_event in subgraph_events
                    ]
                    if len(subgraph_events) > 0:
                        tx_receipt = w3.eth.get_transaction_receipt(log.transactionHash)
                        decoded_logs = contract_event().processReceipt(tx_receipt)
                        for decoded_log in decoded_logs:
                            matching_events = matching_events.append(
                                {
                                    "address": address,
                                    "block": block,
                                    "event": contract_event.event_name,
                                    "subgraph_events": subgraph_events,
                                    "handlers": handlers,
                                    "log_params": dict(decoded_log.args),
                                },
                                ignore_index=True,
                            )
    return matching_events


# async def get_matching_events_async(datasources, divergent_blocks) -> pd.DataFrame:
#     matching_events = await green_spawn(
#         get_matching_events_async(datasources, divergent_blocks)
#     )
#     return matching_events


def get_subgraph_manifest(subgraph_id: str):
    manifest = yaml.safe_load(ipfs.cat(subgraph_id))
    return manifest


def get_subgraph_data_sources(manifest):
    data_sources = list(map(getSource, manifest["dataSources"]))
    return data_sources


def genereate_unique_events(matching_events: pd.DataFrame):
    unique_event_signatures = matching_events.drop_duplicates(
        subset=["block", "address", "event"]
    ).drop(["log_params", "subgraph_events"], axis=1)
    return unique_event_signatures
