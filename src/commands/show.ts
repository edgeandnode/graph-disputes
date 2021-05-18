/* eslint-disable @typescript-eslint/no-explicit-any */

import treeify from 'treeify'
import { SingleBar } from 'cli-progress'
import { Argv } from 'yargs'
import { SubgraphDeploymentID } from '@graphprotocol/common-ts'

import { log } from '../logging'
import { populateEntry } from '../dispute'
import { setupEnv } from '../env'
import { getDispute } from '../model'
import { Poi } from '../poi'

export const showCommand = {
  command: 'show <id>',
  describe: 'Show arbitration dispute',
  builder: (yargs: Argv): Argv => {
    return yargs
      .positional('id', { description: 'Dispute ID', type: 'string' })
      .option('rainbow', {
        description: 'Prints a poi debugging table',
        type: 'boolean',
      })
  },
  handler: async (
    argv: { [key: string]: any } & Argv['argv'],
  ): Promise<void> => {
    const env = await setupEnv(argv)

    // Parse arguments
    const disputeID = argv.id

    // Get dispute
    const dispute = await getDispute(env.networkSubgraph, disputeID)
    const disputeEntry = await populateEntry(dispute, env, true)
    log.info(`Dispute #${disputeID}`)
    log.info('-------')
    log.info(treeify.asTree({ ...disputeEntry }, true, true))

    // Try to find the presented Poi comparing with all the blocks
    // between previous epoch start block and block for the closed allocation
    // This can help find bugs in the software
    if (argv.rainbow) {
      const endBlock = dispute.allocation.closedAtBlockNumber
      const startBlock = disputeEntry.referencePoi.prevEpoch.startBlock
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
      await env.poiChecker.getPoiRangeStream(
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
  },
}
