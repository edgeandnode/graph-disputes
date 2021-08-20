import chalk from 'chalk'
import { SubgraphDeploymentID } from '@graphprotocol/common-ts'
import { BigNumber } from 'ethers'

import { getEpoch, Dispute, GraphNetwork } from './model'
import { Environment } from './env'
import { toGRT } from './utils'
import { EthereumBlock } from './poi'

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
  const disputeEntry = {
    [chalk.bold('Type')]: styleType(dispute.type),
    [chalk.bold('Status')]: `${styleDisputeStatus(
      dispute.status,
    )} (${lastActionAgo} days ago)`,
    [chalk.bold('Indexer')]: indexerName
      ? `${chalk.bold.cyanBright(indexerName)} ` +
        chalk.gray(`(${dispute.indexer.id})`)
      : chalk.cyanBright(dispute.indexer.id),
    [chalk.bold('Fisherman')]: chalk.cyanBright(
      fishermanName
        ? `${fishermanName} (${dispute.fisherman.id})`
        : dispute.fisherman.id,
    ),
    [chalk.bold('SubgraphDeployment')]: {
      id:
        chalk.cyanBright(subgraphDeployment.bytes32) +
        chalk.gray(` (${subgraphDeployment.ipfsHash})`),
    },
    [chalk.bold('Economics')]: {
      indexerSlashableStake: chalk.greenBright(`${slashableStake} GRT`),
      indexingRewardsCollected: chalk.greenBright(`${indexingRewards} GRT`),
    },
    [chalk.bold('Allocation')]: {
      id: chalk.cyanBright(dispute.allocation.id),
      createdAtEpoch: chalk.cyanBright(dispute.allocation.createdAtEpoch),
      createdAtBlock: chalk.cyanBright(dispute.allocation.createdAtBlockHash),
      closedAtEpoch: {
        id: styleClosedAtEpoch(
          dispute.allocation.closedAtEpoch,
          networkSettings,
        ),
        startBlock:
          chalk.cyanBright(lastBlock.hash) +
          chalk.gray(` (#${lastBlock.number})`),
      },
      closedAtBlock:
        chalk.cyanBright(dispute.allocation.closedAtBlockHash) +
        chalk.gray(` (#${dispute.allocation.closedAtBlockNumber})`),
    },
    [chalk.bold('POI')]: {
      submitted: chalk.cyanBright(dispute.allocation.poi),
      match: hasProof
        ? styleBoolean(
            lastPoi.proof === dispute.allocation.poi ||
              prevPoi.proof === dispute.allocation.poi,
          )
        : chalk.redBright('Not-Found'),
      previousEpochPOI: hasProof
        ? chalk.cyanBright(prevPoi.proof)
        : chalk.gray('Not-Found'),
      lastEpochPOI: hasProof
        ? chalk.cyanBright(lastPoi.proof)
        : chalk.gray('Not-Found'),
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
