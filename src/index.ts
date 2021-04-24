import * as yargs from 'yargs'

import { createCommand } from './commands/create'
import { acceptDisputeCommand, rejectDisputeCommand } from './commands/resolve'
import { listCommand } from './commands/list'
import { showCommand } from './commands/show'

yargs
  .scriptName('graph-disputes')
  .env('GRAPH_DISPUTES')
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
  .option('trusted-subgraph-endpoint', {
    description: 'Endpoint to query the trusted indexig proofs',
    type: 'string',
    required: true,
    group: 'Trusted Subgraph',
  })
  .option('log-level', {
    description: 'Log level',
    type: 'string',
    default: 'debug',
    group: 'Logging',
  })
  .command(createCommand)
  .command(listCommand)
  .command(showCommand)
  .command(acceptDisputeCommand)
  .command(rejectDisputeCommand)
  .demandCommand(1, 'Choose a command from the above list')
  .help().argv
