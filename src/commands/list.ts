/* eslint-disable @typescript-eslint/no-explicit-any */
import ora from 'ora'
import treeify from 'treeify'
import chalk from 'chalk'
import { Argv } from 'yargs'

import { log } from '../logging'
import { populateEntry } from '../dispute'
import { getDisputes, getNetworkSettings } from '../model'

export const listCommand = {
  command: 'list',
  describe: 'List disputes',
  builder: (yargs: Argv): Argv => {
    return yargs
      .usage('$0 [--status <accepted|rejected|draw|undecided|all>]')
      .option('status', {
        description: 'Dispute status',
        group: 'List',
        type: 'string',
        choices: ['accepted', 'rejected', 'draw', 'undecided', 'all'],
        default: 'undecided',
      })
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
    const networkSettings = await getNetworkSettings(networkSubgraph)
    const disputes = await getDisputes(networkSubgraph, status)
    log.info(`Found: ${disputes.length}\n`)

    // Process each dispute and populate additional information
    await Promise.all(
      disputes.map(async dispute => {
        const disputeEntry = await populateEntry(
          dispute,
          env,
          networkSettings,
          false,
        )
        data[dispute.id] = disputeEntry
      }),
    )
    spinner.stop()

    // sort disputes
    const findDisputeById = (id: string) => disputes.find(d => d.id === id)
    const orderedDisputeIds = Object.keys(data).sort((d1, d2) =>
      findDisputeById(d1).createdAt > findDisputeById(d2).createdAt ? 1 : -1,
    )
    const sortedData = {}
    orderedDisputeIds.forEach(disputeId => {
      sortedData[chalk.whiteBright.underline(disputeId)] = data[disputeId]
    })
    // Display disputes
    log.info('Disputes')
    log.info('--------')
    log.info(treeify.asTree(sortedData, true, true))
  },
}
