/* eslint-disable @typescript-eslint/no-explicit-any */
import ora from 'ora'
import treeify from 'treeify'
import chalk from 'chalk'
import { Argv } from 'yargs'

import { log } from '../logging'
import { populateEntry } from '../dispute'
import { getDisputes } from '../model'

export const listCommand = {
  command: 'list',
  describe: 'List disputes',
  handler: async (
    argv: { [key: string]: any } & Argv['argv'],
  ): Promise<void> => {
    const env = argv.env
    const { networkSubgraph } = env

    // Get disputes to list
    const spinner = ora('Loading disputes...\n').start()
    const data = {}
    const disputes = await getDisputes(networkSubgraph)
    log.info(`Found: ${disputes.length}\n`)

    // Process each dispute and populate additional information
    await Promise.all(
      disputes.map(async dispute => {
        const disputeEntry = await populateEntry(dispute, env, false)
        data[chalk.whiteBright.underline(dispute.id)] = disputeEntry
      }),
    )
    spinner.stop()

    // Display disputes
    log.info('Disputes')
    log.info('--------')
    log.info(treeify.asTree(data, true, true))
  },
}
