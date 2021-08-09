##Endpoint for gql queries about the status of the network
from typing import List
from gql import Client, gql
from gql.transport.requests import RequestsHTTPTransport

# Does the graphql endpoint limit responses to 100 entities?
NETWORK_SUBGRAPH = (
    "https://api.thegraph.com/subgraphs/name/graphprotocol/graph-network-mainnet"
)

sync_transport = RequestsHTTPTransport(
    url=NETWORK_SUBGRAPH,
    verify=False,
    retries=3,
)

# Make it so this gets instantiated in the function call and passed as a parameter.
client = Client(
    transport=sync_transport,
    fetch_schema_from_transport=True,
)

EXAMPLE_DISPUTE_ID = (
    "0x08e959b7cf82f4935a5063721d7b7a01a0b33ebf0c8056b4d7ce4d126e7049a3"
)
EXAMPLE_SUBGRAPH_ID = (
    "0x500a8e47cbdeca7386448ae9e7d52578871b9942ebbef4892469da293bb661f9"
)

GATHER_DISPUTE_QUERY = gql(
    """
     query($dispute_id: ID!){
        dispute(id:$dispute_id) {
        id
        createdAt
        status
        type
        subgraphDeployment{
            id
        }
        indexer{
            id
            balance
            curationApproval
            stakingApproval
            names{
                id
                name
                nameSystem
            }
            createdAt
            operatorOf{
                id
                names{
                    id
                    name
                    nameSystem
                }
            }
            operators{
                id
                names{
                    id
                    name
                    nameSystem
                }
            }
        }
    }}
"""
)


def get_dispute_from_id(dispute_id: str) -> dict:
    """
    Query against network subgraph to get information about a dispute
    """
    params = {"dispute_id": dispute_id}
    disp = client.execute(GATHER_DISPUTE_QUERY, variable_values=params)
    return disp


def get_subgraph_deployment_id_from_dispute(dispute_dictionary: dict):
    dispute = dispute_dictionary.get("dispute", {})
    if not dispute:
        return ""
    subgraph_id = dispute.get("subgraphDeployment", "").get("id", "")
    return subgraph_id


GATHER_INDEXERS_FOR_SUBGRAPH_QUERY = gql(
    """
    query($subgraph_deployment_id: ID!){
    subgraphDeployment(id:$subgraph_deployment_id) {
        indexerAllocations{
            id
            indexer{
                id
                geoHash
                defaultDisplayName
                account{
                    id
                    names{
                        id
                        name
                        nameSystem
                    }
                } 
            }
        allocatedTokens
        createdAtBlockNumber
        closedAtEpoch
        closedAtBlockNumber
        poi
        }
    }
    }
    """
)


def get_subgraph_deployment(subgraph_deployment: str):
    """
    Make a call against the network subgraph for data pertinent to a subgraph deployment.
    """
    params = {"subgraph_deployment_id": subgraph_deployment}
    subgraph_deployment = client.execute(
        GATHER_INDEXERS_FOR_SUBGRAPH_QUERY, variable_values=params
    )
    return subgraph_deployment


def get_indexers_from_subgraph_deployment(subgraph_deployment: dict) -> List[str]:
    """
    Gets all unique indexers that have made an allocation on a subgraph deployment.

    Idea is that these entities will have the relevant data to settle an arbitration.

    CAVEAT:
        * Are these indexers all still relevant?
        * Can we filter on recency of the allocation
        in regards to the dispute?
        * Do we want to consider ancillary data, like the indexer stake etc. in the dispute
        arbitration process? (Could be a way to generate a "reference" indexer through some
        mechanism of weighing influence)
    """
    subgraph_dict = subgraph_deployment.get("subgraphDeployment", {})
    if not subgraph_dict:
        return []
    indexer_allocations = subgraph_dict.get("indexerAllocations", {})
    if not indexer_allocations:
        return []

    indexer_ids = [
        allocation.get("indexer").get("id") for allocation in indexer_allocations
    ]
    return list(set(indexer_ids))
