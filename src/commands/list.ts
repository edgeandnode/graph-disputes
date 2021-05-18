/* eslint-disable @typescript-eslint/no-explicit-any */

import treeify from 'treeify'
import chalk from 'chalk'
import { Argv } from 'yargs'

import { log } from '../logging'
import { populateEntry } from '../dispute'
import { setupEnv } from '../env'
import { getDisputes } from '../model'

export const listCommand = {
  command: 'list',
  describe: 'List disputes',
  handler: async (
    argv: { [key: string]: any } & Argv['argv'],
  ): Promise<void> => {
    const env = await setupEnv(argv)

    // Get disputes to list
    const data = {}
    const disputes = await getDisputes(env.networkSubgraph)
    log.info(`Disputes found: ${disputes.length}`)

    // Process each dispute and populate additional information
    for (const dispute of disputes) {
      const disputeEntry = await populateEntry(dispute, env, false)
      data[chalk.whiteBright.underline(dispute.id)] = disputeEntry
    }

    // Display disputes
    log.info('Disputes')
    log.info('--------')
    log.info(treeify.asTree(data, true, true))
  },
}
