/* eslint-disable @typescript-eslint/no-explicit-any */

import ora from 'ora'
import treeify from 'object-treeify'
import chalk from 'chalk'
import { SingleBar } from 'cli-progress'
import { Argv } from 'yargs'
import { SubgraphDeploymentID } from '@graphprotocol/common-ts'

import { log } from '../logging'
import { formatEntry, populateEntry } from '../dispute'
import { getDispute, getNetworkSettings } from '../model'
import { Poi } from '../poi'
import { Environment } from '../env'
import { treeifyFormat } from '../utils'

export const showCommand = {
  command: 'show <ids>',
  describe: 'Show arbitration dispute/s',
  builder: (yargs: Argv): Argv => {
    return yargs
      .positional('ids', {
        description: 'Comma-separated list of dispute IDs',
        type: 'string',
      })
      .option('rainbow', {
        description: 'Prints a poi debugging table',
        type: 'boolean',
      })
  },
  handler: async (
    argv: { [key: string]: any } & Argv['argv'],
  ): Promise<void> => {
    // Parse arguments
    const env: Environment = argv.env
    const disputeIDs = argv.ids.split(',')
    const rainbow = argv.rainbow
    const { networkSubgraph, poiChecker } = env

    for (const disputeID of disputeIDs) {
      // Get dispute
      const spinner = ora('Loading dispute...\n').start()
      const dispute = await getDispute(networkSubgraph, disputeID)
      const networkSettings = await getNetworkSettings(networkSubgraph)
      const disputeEntry = await populateEntry(
        dispute,
        env,
        networkSettings,
        true,
      )
      log.info(`${chalk.bold('Dispute:')} ${chalk.cyanBright(disputeID)}`)
      log.info(chalk.gray('-------'))
      log.info(
        treeify(formatEntry(disputeEntry, networkSettings), treeifyFormat),
      )
      spinner.stop()

      // Try to find the presented Poi comparing with all the blocks
      // between previous epoch start block and block for the closed allocation
      // This can help find bugs in the software
      if (rainbow && disputeIDs.length === 1) {
        const endBlock = dispute.allocation.closedAtBlockNumber
        const startBlock = disputeEntry.POI.Reference.prevEpoch.startBlock
        const blockDiff = endBlock - startBlock
        const bar = new SingleBar({
          format:
            'CLI Progress |' +
            '{bar}' +
            '| {percentage}% || {value}/{total} Blocks',
          barCompleteChar: '\u2588',
          barIncompleteChar: '\u2591',
          hideCursor: true,
        })
        bar.start(blockDiff, 0)
        log.info(`PoIs for range (${startBlock} -> ${endBlock})`)
        log.info('---------------------------------------------\n')
        await poiChecker.getPoiRangeStream(
          new SubgraphDeploymentID(dispute.subgraphDeployment.id),
          startBlock,
          endBlock,
          dispute.indexer.id,
          (poi: Poi) => {
            if (poi.proof === dispute.allocation.poi) {
              log.info(
                `Poi presented matches reference one for block ${poi.block.number}`,
              )
              process.exit()
            }
            bar.increment()
          },
        )
        bar.stop()
        log.info('Not matching reference Poi found')
      }
    }
  },
}
