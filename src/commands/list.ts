/* eslint-disable @typescript-eslint/no-explicit-any */

import Table from 'cli-table'
import chalk from 'chalk'
import { Argv } from 'yargs'

import { setupEnv } from '../env'
import { getDisputes } from '../model'

const disputeToRow = dispute => {
  function styleStatus(status) {
    switch (status) {
      case 'Accepted':
        return chalk.greenBright(dispute.status)
      case 'Rejected':
        return chalk.redBright(dispute.status)
      case 'Draw':
        return chalk.yellowBright(dispute.status)
    }
    return chalk.grey(dispute.status)
  }

  return [
    dispute.type + '\n' + dispute.id,
    styleStatus(dispute.status),
    dispute.indexer.id,
    dispute.fisherman.id,
  ]
}

export const listCommand = {
  command: 'list',
  describe: 'List arbitration disputes',
  builder: (yargs: Argv): Argv => {
    return yargs
      .option('ethereum', {
        description: 'Ethereum node or provider URL',
        type: 'string',
        required: true,
        group: 'Ethereum',
      })
      .option('ethereum-network', {
        description: 'Ethereum network',
        type: 'string',
        required: false,
        default: 'mainnet',
        group: 'Ethereum',
      })
      .option('network-subgraph-endpoint', {
        description: 'Endpoint to query the network subgraph from',
        type: 'string',
        required: true,
        group: 'Network Subgraph',
      })
      .option('log-level', {
        description: 'Log level',
        type: 'string',
        default: 'debug',
        group: 'Logging',
      })
  },
  handler: async (
    argv: { [key: string]: any } & Argv['argv'],
  ): Promise<void> => {
    const { contracts, networkSubgraph } = await setupEnv(argv)

    const table = new Table({
      head: ['ID', 'Status', 'Indexer', 'Submitter'],
      colWidths: [68, 10, 44, 44],
    })

    const disputes = await getDisputes(networkSubgraph)
    for (const dispute of disputes) {
      table.push(disputeToRow(dispute))
    }
    console.log(table.toString())
  },
}
