/* eslint-disable @typescript-eslint/no-explicit-any */

import ora from 'ora'
import chalk from 'chalk'
import { Argv } from 'yargs'

import { addDefaultArgOptions } from '../config'
import { log } from '../logging'
import { getAllocationsByDeployment, getPOISubmissions, POISubmission } from '../model'

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

export const poisCommand = {
  command: 'pois <deploymentIpfsHash>',
  describe: 'List POI submissions for a deployment grouped by epoch and publicPoi',
  builder: (yargs: Argv): Argv => {
    return addDefaultArgOptions(
      yargs
        .positional('deploymentIpfsHash', {
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
    const ipfsHash = argv.deploymentIpfsHash as string
    const indexerFilters = argv.indexer as string[] | undefined
    const jsonOutput = argv.json as boolean

    const spinner = ora(`Fetching allocations for deployment ${ipfsHash}...`).start()

    const allocations = await getAllocationsByDeployment(networkSubgraph, ipfsHash)
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
