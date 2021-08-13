import chalk from 'chalk'
import { SubgraphDeploymentID } from '@graphprotocol/common-ts'
import { BigNumber } from 'ethers'

import { getEpoch, Dispute, GraphNetwork } from './model'
import { Environment } from './env'
import { toGRT } from './utils'

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

function styleDisputeStatus(status: string) {
  switch (status) {
    case 'Accepted':
      return chalk.greenBright(status)
    case 'Rejected':
      return chalk.redBright(status)
    case 'Draw':
      return chalk.yellowBright(status)
  }
  return chalk.dim(status)
}

const DAY_SECONDS = 60 * 60 * 24

function relativeDays(ts: number) {
  return ((+new Date() / 1000 - ts) / DAY_SECONDS).toFixed(2)
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
  const [lastBlock, prevBlock] = await Promise.all([
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

  // Assemble dispute data
  const disputeEntry = {
    Type: styleType(dispute.type),
    Status: `${styleDisputeStatus(dispute.status)} (${lastActionAgo} days ago)`,
    Indexer: chalk.cyanBright(dispute.indexer.id),
    Fisherman: chalk.cyanBright(dispute.fisherman.id),
    SubgraphDeployment: {
      id: `${subgraphDeployment.bytes32} (${subgraphDeployment.ipfsHash})`,
    },
    Economics: {
      indexerSlashableStake: chalk.greenBright(`${slashableStake} GRT`),
      indexingRewardsCollected: chalk.greenBright(`${indexingRewards} GRT`),
    },
    Allocation: {
      id: chalk.cyanBright(dispute.allocation.id),
      createdAtEpoch: dispute.allocation.createdAtEpoch,
      createdAtBlock: dispute.allocation.createdAtBlockHash,
      closedAtEpoch: dispute.allocation.closedAtEpoch,
      closedAtBlock: `${dispute.allocation.closedAtBlockHash} (#${dispute.allocation.closedAtBlockNumber})`,
    },
    POI: {
      submitted: dispute.allocation.poi,
      match: hasProof
        ? styleBoolean(
            lastPoi.proof === dispute.allocation.poi ||
              prevPoi.proof === dispute.allocation.poi,
          )
        : chalk.redBright('Not-Found'),
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

    // Rewards
    // const disputeManager = contracts.disputeManager
    // const [slashedAmount, rewardsAmount] = await Promise.all([
    //   disputeManager.getTokensToSlash(dispute.indexer.id),
    //   disputeManager.getTokensToReward(dispute.indexer.id),
    // ])
    // disputeEntry['Rewards'] = {
    //   slashAmount: formatGRT(slashedAmount),
    //   rewardsAmount: formatGRT(rewardsAmount),
    // }
  }

  return disputeEntry
}
