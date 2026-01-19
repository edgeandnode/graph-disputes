import { join } from 'path'
import { homedir } from 'os'
import fs from 'fs'

export const DEFAULT_CONFIG_NAME = '.graph-disputes'
export const DEFAULT_CONFIG_PATH = join(homedir(), DEFAULT_CONFIG_NAME)

interface Config {
  ethereum: string
  ethereumNetwork: string
  networkSubgraphEndpoint: string
  trustedSubgraphEndpoint: string
  eboSubgraphEndpoint: string
}

export const initConfig = (config: Config): void => {
  const value = JSON.stringify(config)
  fs.writeFileSync(DEFAULT_CONFIG_PATH, value, { flag: 'w' })
}

export const loadConfig = (): Config | null => {
  try {
    return JSON.parse(fs.readFileSync(DEFAULT_CONFIG_PATH).toString())
  } catch {
    return null
  }
}

export const addDefaultArgOptions = yargs => {
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
    .option('trusted-subgraph-endpoint', {
      description: 'Endpoint to query the trusted indexing proofs',
      type: 'string',
      required: true,
      group: 'Trusted Subgraph',
    })
    .option('ebo-subgraph-endpoint', {
      description: 'Endpoint to query the EBO (Epoch Block Oracle) subgraph',
      type: 'string',
      required: false,
      group: 'EBO Subgraph',
    })
    .option('log-level', {
      description: 'Log level',
      type: 'string',
      default: 'debug',
      group: 'Logging',
    })
}
