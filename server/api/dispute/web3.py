from web3 import Web3
import yaml
import logging
import pandas as pd
import ipfshttpclient


logger = logging.getLogger(__name__)


##Make these environment variables
w3 = Web3(
    Web3.HTTPProvider(
        "https://eth-mainnet.alchemyapi.io/v2/mWSH9YlhpXfXymzLxptC1TE2CIy2QuMA"
    )
)
ipfs = ipfshttpclient.connect("/dns/ipfs.infura.io/tcp/5001/https")


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
        print("source address", address)
        contract_abi = source.abi.decode("utf-8")
        contract = w3.eth.contract(address=address, abi=contract_abi)
        for block in divergent_blocks:
            print("  block:", block)
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
                            print("    - event:", contract_event.event_name)
                            print("      log_params:")
                            for arg, value in decoded_log.args.items():
                                print(
                                    "          {arg}: {value}".format(
                                        arg=arg, value=value
                                    )
                                )
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
