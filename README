# Graph Disputes CLI

This script makes it easy to manage disputes for wrong indexing proofs and bad query responses.

## Setup

The CLI facilitates the interaction with the Graph Network contracts and adds validations before submitting a dispute.

```bash
npm i -g @graphprotocol/graph-disputes
```

Have the following at hand:

- Endpoint to query for trusted POIs
- Ethereum node RPC-URL
- Network subgraph URL
- A private key, only for creating disputes
- Funds for the deposit bond (10k GRT)

The script accepts these values as input and you can change based on the desired environment (Mainnet, Rinkeby, etc.)

Create a config file running:
```
graph-disputes setup
```

This will store a configuration file with the default endpoints to use for querying the network.

## Commands

Run `graph-disputes` with no parameters to see a list of commands.

```bash
# Init
graph-dispute setup

# General
graph-disputes dispute list
graph-disputes dispute show <disputeID>

# Submitter
graph-disputes dispute create indexing <allocationID> <deposit>
graph-disputes dispute create query <attestation> <deposit>

# Arbitrator
graph-disputes dispute reject <disputeID>
graph-disputes dispute accept <disputeID>
graph-disputes dispute draw <disputeID>
```


## Disputes

Refer to the [Arbitration Charter](https://hackmd.io/@4Ln8SAS4RX-505bIHZTeRw/BJcHzpHDu) to check what is considered as a valid dispute.

### Indexing Disputes

An **allocationID** identifies an indexer stake on a particular subgraph. Whenever an indexer closes an allocation it needs to present a valid proof called POI (proof of indexing) to get rewards and avoid slashing.

Anyone can dispute an allocationID if they think the POI is wrong. To do so, you will send a transaction to the DisputeManager contract for the arbitrators to resolve.

For example:

```bash
graph-dispute create indexing 0x1ba0b254146759a5680a6f11919192a605569816 10000
```

#### Conditions

Enforced by the contract:
- Only one active dispute can be created for an allocation.
- The allocation must exist in the Staking contract.
- The indexer must have available stake.
- The deposit bond must be over the minimum required.

Enforced by the CLI:
- **Double Jeopardy:** No new dispute on an allocation that was resolved.
- **Statute of Limitations:** Allocation must be within the allowed time.
- **Data Availability:** Files to reproduce the invalid condition must be accesible (subgraph manifest, schema and mappings).

### Query Disputes

Whenever an indexer respond to a query it signs a message called **Attestation**, a receipt of the returned data:

```
struct Attestation {
    bytes32 requestCID;
    bytes32 responseCID;
    bytes32 subgraphDeploymentID;
    bytes32 r;
    bytes32 s;
    uint8 v;
}
```

If you consider that the query response is invalid, you can submit a dispute passing the attestation bytes to the script.

For example:

```bash
graph-dispute create query 0xd902c18a1b3590a3d2a8ae4439db376764fda153ca077e339d0427bf776bd463be0b5ae5f598fdf631133571d59ef16b443b2fe02e35ca2cb807158069009db94d31d21d389263c98d1e83a031e8fed17cdcef15bd62ee8153f34188a83c7b1cafbcf5d1b7c0ff3f6045d76ad34c0e616c5366bf47d82b41da96d7fc5d844dcf2f65e6b5ae86d43669197a189ad11afa2c661f787fca2a43b2a2c22938b1a0a91c 10000 \
```

In addition to that you will need to post the original request you sent that matches the _requestCID_, that way anyone can verify if the returned data is valid.

#### Conditions

Enforced by the contract:
- Only one dispute with the same data and same submitter can be active.
- The indexer must have available stake.
- The deposit bond must be over the minimum required.

Enforced by the CLI:
- **Double Jeopardy:** No new dispute on an allocation that was resolved.
- **Statute of Limitations:** Allocation must be within the allowed time.
- **Data Availability:** Files to reproduce the invalid condition must be accesible (subgraph manifest, schema and mappings).

## Arbitration

The Arbitration process is managed by a Multisig that can be changed anytime by the Graph Council.

### List Disputes

The `list` command allows shows you the active disputes:

```bash
graph-dispute list
```

**Result:**

![](https://i.imgur.com/scFaGVF.png)


### Resolution

A Dispute can have the following results:

- **Accepted:** Indexer gets slashed, the deposit is returned to the submitter, 50% of the slash is given to the submitter as reward and the rest is burned.
- **Rejected:** Indexer is not slashed and the submitter loses their deposit.
- **Drawn:** Indexer is not slashed and the deposit is returned to the submitter.

## Relevant Network Parameters

- 2.5% slashing percentage over the indexer stake
  You can check that here -> https://network.thegraph.com/network

- 50% submitter reward based on the slashed stake

- 10,000 GRT submitter deposit required

#### Notes

- The disputeID is created when the dispute is submitted.

## Contract Addresses

Disputes are created and resolved in the DisputeManager contract. This contract has the permission to slash stake from the Staking contract whenever a dispute is accepted.

### Mainnet

DisputeManager: 0x97307b963662cCA2f7eD50e38dCC555dfFc4FB0b
https://etherscan.io/address/0x97307b963662cCA2f7eD50e38dCC555dfFc4FB0b#code

### Rinkeby

DisputeManager: 0x4e4B04008C0f7875CDe80e7546d8b3b03Cf1eCf1
https://rinkeby.etherscan.io/address/0x4e4B04008C0f7875CDe80e7546d8b3b03Cf1eCf1#code
