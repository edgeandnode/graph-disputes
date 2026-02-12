# Graph Disputes CLI

This CLI makes it easy to manage disputes for wrong indexing proofs and bad query responses.

## Setup

The CLI facilitates the interaction with the Graph Network contracts and adds validations before submitting a dispute.

```bash
pnpm i -g @graphprotocol/graph-disputes
```

Have the following at hand:

- Ethereum node RPC-URL
- Network subgraph endpoint
- Trusted POI subgraph endpoint
- EBO (Epoch Block Oracle) subgraph endpoint (optional, for POI queries)
- A private key (only for creating disputes)
- Funds for the deposit bond (10k GRT)

The script accepts these values as input and you can change based on the desired environment (Arbitrum One, Arbitrum Sepolia, etc.)

Create a config file running:
```bash
graph-disputes setup
```

This will store a configuration file with the default endpoints to use for querying the network.

## Commands

Run `graph-disputes` with no parameters to see a list of commands.

```bash
# Setup
graph-disputes setup

# List and show disputes
graph-disputes list [--status <accepted|rejected|draw|undecided|all>]
graph-disputes show <disputeID>

# Inspect allocation
graph-disputes inspect <allocationID>

# POI commands
graph-disputes poi list <deployment> [--indexer <address>...]
graph-disputes poi query <deployment> --epoch <n|range> --chain <chainId> --indexer <address>...

# Create disputes (Fisherman)
graph-disputes create indexing <allocationID> <poi> <blockNumber>
graph-disputes create query <attestation>

# Resolve disputes (Arbitrator)
graph-disputes resolve reject <disputeID>
graph-disputes resolve accept <disputeID>
graph-disputes resolve draw <disputeID>
```

## POI Commands

The `poi` commands help investigate POI (Proof of Indexing) discrepancies before filing a dispute.

### poi list

List submitted POI submissions for a deployment, grouped by epoch and publicPoi:

```bash
graph-disputes poi list QmdDSA73QkFAvRZqtRoHgLvxonuSZTuJhoWkmBtEdVuTmz
```

Filter by specific indexers to compare:
```bash
graph-disputes poi list QmdDSA73QkFAvRZqtRoHgLvxonuSZTuJhoWkmBtEdVuTmz \
  --indexer 0x123... \
  --indexer 0x456...
```

Epochs with multiple different POIs are flagged with `[POI MISMATCH]`.

### poi query

Query indexers directly for their live POI calculation at a specific epoch:

```bash
graph-disputes poi query QmdDSA73QkFAvRZqtRoHgLvxonuSZTuJhoWkmBtEdVuTmz \
  --epoch 1132 \
  --chain 43114 \
  --indexer 0x123...
```

Query a range of epochs:
```bash
graph-disputes poi query QmdDSA73QkFAvRZqtRoHgLvxonuSZTuJhoWkmBtEdVuTmz \
  --epoch 1130-1135 \
  --chain 43114 \
  --indexer 0x123... \
  --indexer 0x456...
```

This command requires the EBO subgraph endpoint to be configured (to resolve epoch → block number).


## Disputes

Refer to the [Arbitration Charter](https://hackmd.io/@4Ln8SAS4RX-505bIHZTeRw/BJcHzpHDu) to check what is considered as a valid dispute.

### Indexing Disputes

An **allocationID** identifies an indexer stake on a particular subgraph. Whenever an indexer closes an allocation it needs to present a valid proof called POI (proof of indexing) to get rewards and avoid slashing.

Anyone can dispute an allocationID if they think the POI is wrong. To do so, you will send a transaction to the DisputeManager contract for the arbitrators to resolve.

For example:

```bash
graph-disputes create indexing 0x1ba0b254146759a5680a6f11919192a605569816 0xabc123...poi 12345678
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
graph-disputes create query 0xd902c18a1b3590a3d2a8ae4439db376764fda153ca077e339d0427bf776bd463be0b5ae5f598fdf631133571d59ef16b443b2fe02e35ca2cb807158069009db94d31d21d389263c98d1e83a031e8fed17cdcef15bd62ee8153f34188a83c7b1cafbcf5d1b7c0ff3f6045d76ad34c0e616c5366bf47d82b41da96d7fc5d844dcf2f65e6b5ae86d43669197a189ad11afa2c661f787fca2a43b2a2c22938b1a0a91c
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

The `list` command shows you the active (undecided) disputes:

```bash
graph-disputes list
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

