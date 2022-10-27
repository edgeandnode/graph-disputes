import inquirer from 'inquirer'

import { DEFAULT_CONFIG_PATH, initConfig, loadConfig } from '../config'
import { askConfirm } from '../utils'
import { log } from '../logging'

const isValidURL = (value: string): boolean | string => {
  const isValid =
    value.indexOf('http://') === 0 || value.indexOf('https://') === 0
  return isValid || 'Invalid URL'
}

export const setupCommand = {
  command: 'setup',
  describe: 'Setup config',
  handler: async (): Promise<void> => {
    // Check if the config file exists
    const config = loadConfig()
    if (config) {
      log.info(`Config file found (${DEFAULT_CONFIG_PATH})...`)
      log.info(JSON.stringify(config, null, 2))
      if (!(await askConfirm('Do you want to override?'))) {
        return
      }
    }
    // Ask for config parameter
    const res = await inquirer.prompt([
      {
        name: 'ethereum',
        message: 'Ethereum Node RPC-URL',
        validate: isValidURL,
      },
      {
        type: 'list',
        name: 'ethereum-network',
        message: 'Ethereum Network',
        choices: [
          {
            key: 'mainnet',
            value: 'mainnet',
          },
          {
            key: 'rinkeby',
            value: 'rinkeby',
          },
        ],
      },
      {
        name: 'network-subgraph-endpoint',
        message: 'Network Subgraph Endpoint',
        validate: isValidURL,
      },
      {
        name: 'trusted-subgraph-network',
        message: 'Trusted Subgraph Endpoint (Leave empty to skip)',
        validate: (value: string) =>
          value.length > 0 ? isValidURL(value) : true,
      },
    ])
    // Save config file
    log.info(`Saving config file (${DEFAULT_CONFIG_PATH})...`)
    initConfig({
      ethereum: res.ethereum,
      ethereumNetwork: res['ethereum-network'],
      networkSubgraphEndpoint: res['network-subgraph-endpoint'],
      trustedSubgraphEndpoint: res['trusted-subgraph-network'],
    })
    log.info('Done!')
  },
}
