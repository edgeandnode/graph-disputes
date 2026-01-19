/* eslint-disable @typescript-eslint/no-explicit-any */

import ora from 'ora'
import chalk from 'chalk'
import yargs, { Argv } from 'yargs'
import fetch from 'isomorphic-fetch'

import { addDefaultArgOptions } from '../config'
import { log } from '../logging'
import {
  getAllocationsByDeployment,
  getPOISubmissions,
  getIndexer,
  getEpochBlockNumber,
  POISubmission,
} from '../model'

// ============================================================================
// Shared types and utilities
// ============================================================================

interface GroupedByEpoch {
  epoch: number
  byPublicPoi: {
    publicPoi: string | null
    allocations: { id: string; indexer: string }[]
  }[]
}

function groupSubmissions(submissions: POISubmission[]): GroupedByEpoch[] {
  const byEpoch = new Map<number, POISubmission[]>()

  for (const sub of submissions) {
    const epoch = sub.submittedAtEpoch
    if (!byEpoch.has(epoch)) {
      byEpoch.set(epoch, [])
    }
    byEpoch.get(epoch)!.push(sub)
  }

  const result: GroupedByEpoch[] = []

  for (const [epoch, subs] of byEpoch) {
    const byPoi = new Map<string | null, { id: string; indexer: string }[]>()

    for (const sub of subs) {
      const poi = sub.publicPoi
      if (!byPoi.has(poi)) {
        byPoi.set(poi, [])
      }
      byPoi.get(poi)!.push({
        id: sub.allocation.id,
        indexer: sub.allocation.indexer.id,
      })
    }

    result.push({
      epoch,
      byPublicPoi: Array.from(byPoi.entries()).map(([publicPoi, allocations]) => ({
        publicPoi,
        allocations,
      })),
    })
  }

  return result.sort((a, b) => a.epoch - b.epoch)
}

async function queryIndexerPOI(
  indexerUrl: string,
  deployment: string,
  blockNumber: number,
): Promise<string | null> {
  const statusUrl = indexerUrl.endsWith('/')
    ? `${indexerUrl}status`
    : `${indexerUrl}/status`

  const query = `
    query {
      publicProofsOfIndexing(
        requests: [{deployment: "${deployment}", blockNumber: ${blockNumber}}]
      ) {
        proofOfIndexing
      }
    }
  `

  const response = await fetch(statusUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`)
  }

  const result = await response.json()

  if (result.errors) {
    throw new Error(result.errors[0]?.message || 'GraphQL error')
  }

  const pois = result.data?.publicProofsOfIndexing
  if (!pois || pois.length === 0) {
    return null
  }

  return pois[0].proofOfIndexing
}

// ============================================================================
// poi list - List submitted POIs from the network subgraph
// ============================================================================

export const poiListCommand = {
  command: 'list <deployment>',
  describe: 'List POI submissions for a deployment',
  builder: (yargs: Argv): Argv => {
    return addDefaultArgOptions(
      yargs
        .positional('deployment', {
          description: 'Subgraph deployment IPFS hash (Qm...)',
          type: 'string',
        })
        .option('indexer', {
          description: 'Filter by indexer address (can specify multiple)',
          type: 'array',
          string: true,
        })
        .option('json', {
          description: 'Output as JSON',
          type: 'boolean',
          default: false,
        }),
    )
  },
  handler: async (
    argv: { [key: string]: any } & Argv['argv'],
  ): Promise<void> => {
    const { networkSubgraph } = argv.env
    const deployment = argv.deployment as string
    const indexerFilters = argv.indexer as string[] | undefined
    const jsonOutput = argv.json as boolean

    const spinner = ora(`Fetching allocations for deployment ${deployment}...`).start()

    const allocations = await getAllocationsByDeployment(networkSubgraph, deployment)
    spinner.text = `Found ${allocations.length} allocations. Fetching POI submissions...`

    if (allocations.length === 0) {
      spinner.stop()
      log.info('No allocations found for this deployment')
      return
    }

    const allocationIds = allocations.map(a => a.id)
    let submissions = await getPOISubmissions(networkSubgraph, allocationIds)
    spinner.stop()

    if (indexerFilters && indexerFilters.length > 0) {
      const filtersLower = indexerFilters.map(f => f.toLowerCase())
      submissions = submissions.filter(s => filtersLower.includes(s.allocation.indexer.id.toLowerCase()))
      log.info(`Found ${submissions.length} POI submissions for ${indexerFilters.length} indexer(s)\n`)
    } else {
      log.info(`Found ${submissions.length} POI submissions\n`)
    }

    if (submissions.length === 0) {
      log.info('No POI submissions found')
      return
    }

    const grouped = groupSubmissions(submissions)

    if (jsonOutput) {
      log.info(JSON.stringify(grouped, null, 2))
      return
    }

    for (const epochGroup of grouped) {
      const hasMismatch = epochGroup.byPublicPoi.length > 1
      const mismatchLabel = hasMismatch ? chalk.red(' [POI MISMATCH]') : ''
      log.info(chalk.bold(`Epoch ${epochGroup.epoch}`) + mismatchLabel)
      for (const poiGroup of epochGroup.byPublicPoi) {
        const poiDisplay = poiGroup.publicPoi
          ? chalk.cyan(poiGroup.publicPoi)
          : chalk.gray('null')
        log.info(`  ${chalk.yellow('publicPoi')}: ${poiDisplay}`)
        for (const alloc of poiGroup.allocations) {
          log.info(`    ${chalk.gray('allocation')}: ${alloc.id} ${chalk.gray('indexer')}: ${alloc.indexer}`)
        }
      }
      log.info('')
    }
  },
}

// ============================================================================
// poi query - Query indexers directly for their live POI calculation
// ============================================================================

function parseEpochRange(epochArg: string): number[] {
  if (epochArg.includes('-')) {
    const [start, end] = epochArg.split('-').map(s => parseInt(s.trim()))
    if (isNaN(start) || isNaN(end) || start > end) {
      throw new Error(`Invalid epoch range: ${epochArg}`)
    }
    const epochs: number[] = []
    for (let i = start; i <= end; i++) {
      epochs.push(i)
    }
    return epochs
  }
  const epoch = parseInt(epochArg)
  if (isNaN(epoch)) {
    throw new Error(`Invalid epoch: ${epochArg}`)
  }
  return [epoch]
}

interface EpochResult {
  epoch: number
  blockNumber: number
  results: { indexer: string; url: string | null; poi: string | null; error?: string }[]
}

export const poiQueryCommand = {
  command: 'query <deployment>',
  describe: 'Query indexers for live POI at specific epoch(s)',
  builder: (yargs: Argv): Argv => {
    return addDefaultArgOptions(
      yargs
        .positional('deployment', {
          description: 'Subgraph deployment ID (0x... or Qm...)',
          type: 'string',
        })
        .option('epoch', {
          description: 'Epoch number or range (e.g., 1132 or 1130-1135)',
          type: 'string',
          demandOption: true,
        })
        .option('chain', {
          description: 'Chain ID (e.g., 42161 for Arbitrum, 1 for Mainnet)',
          type: 'string',
          demandOption: true,
        })
        .option('indexer', {
          description: 'Indexer address to query (can specify multiple)',
          type: 'array',
          string: true,
          demandOption: true,
        })
        .option('json', {
          description: 'Output as JSON',
          type: 'boolean',
          default: false,
        }),
    )
  },
  handler: async (
    argv: { [key: string]: any } & Argv['argv'],
  ): Promise<void> => {
    const { networkSubgraph, eboSubgraph } = argv.env
    const deployment = argv.deployment as string
    const epochArg = argv.epoch as string
    const chainId = argv.chain as string
    const indexerAddresses = argv.indexer as string[]
    const jsonOutput = argv.json as boolean

    if (!eboSubgraph) {
      log.error('EBO subgraph endpoint is required for this command. Set --ebo-subgraph-endpoint or add eboSubgraphEndpoint to your config.')
      return
    }

    let epochs: number[]
    try {
      epochs = parseEpochRange(epochArg)
    } catch (err) {
      log.error(err.message)
      return
    }

    const spinner = ora(`Querying ${epochs.length} epoch(s)...`).start()

    const epochResults: EpochResult[] = []

    for (const epoch of epochs) {
      spinner.text = `Fetching block number for epoch ${epoch}...`

      const blockNumber = await getEpochBlockNumber(eboSubgraph, epoch, chainId)

      if (!blockNumber) {
        log.warn(`Could not find block number for epoch ${epoch} on chain ${chainId}, skipping`)
        continue
      }

      const results: { indexer: string; url: string | null; poi: string | null; error?: string }[] = []

      for (const indexerAddress of indexerAddresses) {
        spinner.text = `Epoch ${epoch}: querying indexer ${indexerAddress}...`

        const indexerInfo = await getIndexer(networkSubgraph, indexerAddress)

        if (!indexerInfo) {
          results.push({ indexer: indexerAddress, url: null, poi: null, error: 'Indexer not found' })
          continue
        }

        if (!indexerInfo.url) {
          results.push({ indexer: indexerAddress, url: null, poi: null, error: 'Indexer has no URL configured' })
          continue
        }

        try {
          const poi = await queryIndexerPOI(indexerInfo.url, deployment, blockNumber)
          results.push({ indexer: indexerAddress, url: indexerInfo.url, poi })
        } catch (err) {
          results.push({ indexer: indexerAddress, url: indexerInfo.url, poi: null, error: err.message })
        }
      }

      epochResults.push({ epoch, blockNumber, results })
    }

    spinner.stop()

    if (jsonOutput) {
      log.info(JSON.stringify({ deployment, chainId, epochs: epochResults }, null, 2))
      return
    }

    log.info(chalk.bold(`POI Query Results`))
    log.info(chalk.gray(`deployment: ${deployment}`))
    log.info(chalk.gray(`chain: ${chainId}\n`))

    for (const epochResult of epochResults) {
      const uniquePois = new Set(epochResult.results.filter(r => r.poi).map(r => r.poi))
      const hasMismatch = uniquePois.size > 1
      const mismatchLabel = hasMismatch ? chalk.red(' [POI MISMATCH]') : ''

      log.info(chalk.bold(`Epoch ${epochResult.epoch}`) + chalk.gray(` (block ${epochResult.blockNumber})`) + mismatchLabel)

      for (const result of epochResult.results) {
        if (result.error) {
          log.info(`  ${chalk.gray('indexer')}: ${result.indexer} ${chalk.red('error')}: ${result.error}`)
        } else if (result.poi) {
          log.info(`  ${chalk.gray('indexer')}: ${result.indexer} ${chalk.yellow('poi')}: ${chalk.cyan(result.poi)}`)
        } else {
          log.info(`  ${chalk.gray('indexer')}: ${result.indexer} ${chalk.yellow('poi')}: ${chalk.gray('null')}`)
        }
      }
      log.info('')
    }
  },
}

// ============================================================================
// poi - Parent command
// ============================================================================

export const poiCommand = {
  command: 'poi',
  describe: 'Public POI commands',
  builder: (yargs: Argv): Argv => {
    return yargs
      .command(poiListCommand)
      .command(poiQueryCommand)
  },
  handler: async (): Promise<void> => {
    yargs.showHelp()
  },
}
