/* eslint-disable @typescript-eslint/no-explicit-any */
import ora from 'ora'
import treeify from 'object-treeify'
import chalk from 'chalk'
import { Argv } from 'yargs'

import { addDefaultArgOptions } from '../config'
import { log } from '../logging'
import { formatEntry, populateEntry } from '../dispute'
import { getDisputes, getNetworkSettings } from '../model'
import { treeifyFormat } from '../utils'

export const listCommand = {
  command: 'list',
  describe: 'List disputes',
  builder: (yargs: Argv): Argv => {
    return addDefaultArgOptions(
      yargs
        .usage('$0 [--status <accepted|rejected|draw|undecided|all>]')
        .option('status', {
          description: 'Dispute status',
          group: 'List',
          type: 'string',
          choices: ['accepted', 'rejected', 'draw', 'undecided', 'all'],
          default: 'undecided',
        }),
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
    // Display disputes
    log.info(chalk.bold('Disputes'))
    log.info(chalk.gray('--------'))
    orderedDisputeIds.forEach(disputeId => {
      log.info(`${chalk.bold('Dispute')} (${chalk.cyanBright(disputeId)})`)
      log.info(
        treeify(formatEntry(data[disputeId], networkSettings), treeifyFormat),
      )
    })
  },
}
