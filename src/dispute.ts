import chalk from 'chalk'
import { SubgraphDeploymentID } from '@graphprotocol/common-ts'
import { BigNumber } from 'ethers'

import { getEpoch, Dispute, GraphNetwork } from './model'
import { Environment } from './env'
import { toGRT } from './utils'
import { EthereumBlock } from './poi'

export type DisputeEntry = {
  Type: string
  Status: {
    status: string
    lastActionAgo: string
  }
  Indexer: {
    name: string
    id: string
  }
  Fisherman: {
    name: string
    id: string
  }
  SubgraphDeployment: {
    id: {
      bytes32: string
      ipfsHash: string
    }
  }
  Economics: {
    indexerSlashableStake: string
    indexingRewardsCollected: string
  }
  Allocation: {
    id: string
    createdAtEpoch: number
    createdAtBlock: string
    closedAtEpoch: {
      id: number
      startBlock: {
        hash: string
        number: number
      }
    }
    closedAtBlock: {
      hash: string
      number: number
    }
  }
  POI: {
    submitted: string
    match: boolean | string
    previousEpochPOI: boolean | string
    lastEpochPOI: string
  }
}

function styleBoolean(value: boolean) {
  return value ? chalk.greenBright(value) : chalk.redBright(value)
}

function styleType(value: string) {
  switch (value) {
    case 'Indexing':
      return chalk.blueBright(value)
    case 'Query':
      return chalk.yellowBright(value)
  }
  return value
}

function styleDisputeStatus(status: DisputeEntry['Status']) {
  switch (status.status) {
    case 'Accepted':
      return chalk.greenBright(status.status)
    case 'Rejected':
      return chalk.redBright(status.status)
    case 'Draw':
      return chalk.yellowBright(status.status)
  }
  return chalk.dim(status.status)
}

function styleClosedAtEpoch(
  closedAtEpoch: number,
  networkSettings: GraphNetwork,
) {
  if (isDisputeOlderThanTwoThawingPeriods(closedAtEpoch, networkSettings)) {
    return (
      chalk.redBright(closedAtEpoch) + chalk.gray(` (${'dispute is too old'})`)
    )
  }
  return chalk.cyanBright(closedAtEpoch)
}

const DAY_SECONDS = 60 * 60 * 24

function relativeDays(ts: number) {
  return ((+new Date() / 1000 - ts) / DAY_SECONDS).toFixed(2)
}

export const isDisputeOlderThanTwoThawingPeriods = (
  closedAtEpoch: number,
  networkSettings: GraphNetwork,
): boolean => {
  const { currentEpoch, thawingPeriod, epochLength } = networkSettings
  const thawingPeriodInEpochs = Math.round(thawingPeriod / epochLength)

  return currentEpoch - closedAtEpoch > 2 * thawingPeriodInEpochs
}

export const populateEntry = async (
  dispute: Dispute,
  env: Environment,
  networkSettings: GraphNetwork,
  extended = false,
): Promise<any> => {
  const { networkSubgraph, provider, poiChecker } = env

  const subgraphDeployment = new SubgraphDeploymentID(
    dispute.subgraphDeployment.id,
  )

  // Epochs
  const [lastEpoch, prevEpoch] = await Promise.all([
    getEpoch(networkSubgraph, dispute.allocation.closedAtEpoch),
    getEpoch(networkSubgraph, dispute.allocation.closedAtEpoch - 1),
  ])

  // Reference POI
  const [lastBlock, prevBlock]: EthereumBlock[] = await Promise.all([
    provider.getBlock(lastEpoch.startBlock),
    provider.getBlock(prevEpoch.startBlock),
  ])
  const [lastPoi, prevPoi] = await Promise.all([
    poiChecker.getPoi(subgraphDeployment, lastBlock, dispute.indexer.id),
    poiChecker.getPoi(subgraphDeployment, prevBlock, dispute.indexer.id),
  ])
  const hasProof = lastPoi && prevPoi

  const lastActionAgo = relativeDays(dispute.createdAt)
  const partsPerMillion = 1000000
  const slashableStake = toGRT(
    BigNumber.from(dispute.indexer.indexer.stakedTokens)
      .mul(networkSettings.indexingSlashingPercentage)
      .div(partsPerMillion),
  )
  const indexingRewards = toGRT(
    BigNumber.from(dispute.allocation.indexingIndexerRewards),
  )

  const indexerName = dispute.indexer.defaultDisplayName
  const fishermanName = dispute.fisherman.defaultDisplayName

  // Assemble dispute data
  const disputeEntry: DisputeEntry = {
    Type: dispute.type,
    Status: {
      status: dispute.status,
      lastActionAgo,
    },
    Indexer: {
      name: indexerName,
      id: dispute.indexer.id,
    },
    Fisherman: {
      name: fishermanName,
      id: dispute.fisherman.id,
    },
    SubgraphDeployment: {
      id: {
        bytes32: subgraphDeployment.bytes32,
        ipfsHash: subgraphDeployment.ipfsHash,
      },
    },
    Economics: {
      indexerSlashableStake: slashableStake,
      indexingRewardsCollected: indexingRewards,
    },
    Allocation: {
      id: dispute.allocation.id,
      createdAtEpoch: dispute.allocation.createdAtEpoch,
      createdAtBlock: dispute.allocation.createdAtBlockHash,
      closedAtEpoch: {
        id: dispute.allocation.closedAtEpoch,
        startBlock: {
          hash: lastBlock.hash,
          number: lastBlock.number,
        },
      },
      closedAtBlock: {
        hash: dispute.allocation.closedAtBlockHash,
        number: dispute.allocation.closedAtBlockNumber,
      },
    },
    POI: {
      submitted: dispute.allocation.poi,
      match: hasProof
        ? lastPoi.proof === dispute.allocation.poi ||
          prevPoi.proof === dispute.allocation.poi
        : 'Not-Found',
      previousEpochPOI: hasProof ? prevPoi.proof : 'Not-Found',
      lastEpochPOI: hasProof ? lastPoi.proof : 'Not-Found',
    },
  }

  // Extended information
  if (extended) {
    // Reference POI
    if (hasProof) {
      disputeEntry.POI['Reference'] = {
        lastEpoch: {
          id: lastEpoch.id,
          startBlock: lastEpoch.startBlock,
          POI: lastPoi.proof,
          match: styleBoolean(lastPoi.proof === dispute.allocation.poi),
        },
        prevEpoch: {
          id: prevEpoch.id,
          startBlock: prevEpoch.startBlock,
          POI: prevPoi.proof,
          match: styleBoolean(prevPoi.proof === dispute.allocation.poi),
        },
      }
    }
  }

  return disputeEntry
}

export const formatEntry = (
  entry: DisputeEntry,
  networkSettings: GraphNetwork,
): Record<string, any> => {
  const formattedEntry = {
    [chalk.bold('Type')]: styleType(entry.Type),
    [chalk.bold('Status')]: `${styleDisputeStatus(entry.Status)} (${
      entry.Status.lastActionAgo
    } days ago)`,
    [chalk.bold('Indexer')]: entry.Indexer.name
      ? `${chalk.bold.cyanBright(entry.Indexer.name)} ` +
        chalk.gray(`(${entry.Indexer.id})`)
      : chalk.cyanBright(entry.Indexer.id),
    [chalk.bold('Fisherman')]: chalk.cyanBright(
      entry.Fisherman.name
        ? `${entry.Fisherman.name} (${entry.Fisherman.id})`
        : entry.Fisherman.id,
    ),
    [chalk.bold('SubgraphDeployment')]: {
      id:
        chalk.cyanBright(entry.SubgraphDeployment.id.bytes32) +
        chalk.gray(` (${entry.SubgraphDeployment.id.ipfsHash})`),
    },
    [chalk.bold('Economics')]: {
      indexerSlashableStake: chalk.greenBright(
        `${entry.Economics.indexerSlashableStake} GRT`,
      ),
      indexingRewardsCollected: chalk.greenBright(
        `${entry.Economics.indexingRewardsCollected} GRT`,
      ),
    },
    [chalk.bold('Allocation')]: {
      id: chalk.cyanBright(entry.Allocation.id),
      createdAtEpoch: chalk.cyanBright(entry.Allocation.createdAtEpoch),
      createdAtBlock: chalk.cyanBright(entry.Allocation.createdAtBlock),
      closedAtEpoch: {
        id: styleClosedAtEpoch(
          entry.Allocation.closedAtEpoch.id,
          networkSettings,
        ),
        startBlock:
          chalk.cyanBright(entry.Allocation.closedAtEpoch.startBlock.hash) +
          chalk.gray(` (#${entry.Allocation.closedAtEpoch.startBlock.number})`),
      },
      closedAtBlock:
        chalk.cyanBright(entry.Allocation.closedAtBlock.hash) +
        chalk.gray(` (#${entry.Allocation.closedAtBlock.number})`),
    },
    [chalk.bold('POI')]: {
      submitted: chalk.cyanBright(entry.POI.submitted),
      match:
        entry.POI.match === 'Not-Found'
          ? chalk.redBright(entry.POI.match)
          : styleBoolean(entry.POI.match as boolean),
      previousEpochPOI:
        entry.POI.match === 'Not-Found'
          ? chalk.gray('Not-Found')
          : chalk.cyanBright(entry.POI.previousEpochPOI),
      lastEpochPOI:
        entry.POI.match === 'Not-Found'
          ? chalk.gray('Not-Found')
          : chalk.cyanBright(entry.POI.lastEpochPOI),
    },
  }
  return formattedEntry
}
