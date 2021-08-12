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
  builder: (yargs: Argv): Argv => {
    return yargs
      .option('status', {
        description: 'Dispute status',
        type: 'string',
        choices: ['accepted', 'rejected', 'draw', 'undecided', 'all'],
        default: 'undecided',
      })
      .usage(
        '$0 [--status <accepted|rejected|draw|undecided|all>]',
        'List disputes',
      )
  },
  handler: async (
    argv: { [key: string]: any } & Argv['argv'],
  ): Promise<void> => {
    const env = argv.env
    const { networkSubgraph } = env

    // Get disputes to list
    const spinner = ora('Loading disputes...\n').start()
    const data = {}
    // capitalize the status
    const status =
      argv.status === 'all'
        ? undefined
        : argv.status[0].toUpperCase() + argv.status.substring(1)
    const disputes = await getDisputes(networkSubgraph, status)
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
