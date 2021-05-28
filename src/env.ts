/* eslint-disable @typescript-eslint/no-explicit-any */

import { Argv } from 'yargs'
import { providers } from 'ethers'
import fetch from 'isomorphic-fetch'
import { Client, createClient } from '@urql/core'
import { NetworkContracts, connectContracts } from '@graphprotocol/common-ts'

import { PoiChecker } from './poi'

import { POIDisputeModels, definePOIDisputeModels, POIDispute } from './store'
import { Sequelize } from 'sequelize'

export interface Environment {
  provider: providers.Provider
  contracts: NetworkContracts
  networkSubgraph: Client
  trustedPOICheckers: PoiChecker[]
  disputesModel: POIDisputeModels
}

export const setupEnv = async (
  argv: { [key: string]: any } & Argv['argv'],
): Promise<Environment> => {
  // Ethereum
  let ethereum
  try {
    ethereum = new URL(argv.ethereum)
  } catch (err) {
    console.error(`Invalid Ethereum URL ${argv.ethereum}`)
    throw err
  }

  const provider = new providers.StaticJsonRpcProvider(
    {
      url: ethereum.toString(),
      user: ethereum.username,
      password: ethereum.password,
      allowInsecureAuthentication: true,
    },
    argv.ethereumNetwork,
  )
  const network = await provider.getNetwork()

  // Contracts
  let contracts = undefined
  try {
    contracts = await connectContracts(provider, network.chainId)
  } catch (err) {
    console.error(
      `Failed to connect to contracts, please ensure you are using the intended Ethereum Network`,
    )
    throw err
  }

  // Network Subgraph
  const networkSubgraph = createClient({
    url: argv.networkSubgraphEndpoint,
    fetch,
    requestPolicy: 'network-only',
  })

  console.log('trusteds', argv.trustedSubgraphEndpoints)

  // Trusted Proof Clients
  const trustedPOICheckers = argv.trustedSubgraphEndpoints.map(endpoint => {
    let name = 'unknown'
    let url = endpoint
    if (!endpoint.startsWith('http')) {
      const index = endpoint.indexOf(':')
      name = endpoint.substr(0, index)
      url = endpoint.substr(index + 1)
    }
    const client = createClient({
      url: url,
      fetch,
      requestPolicy: 'network-only',
    })
    return new PoiChecker(provider, client, name)
  })

  // Trusted Proof Subgraph
  // const trustedSubgraph = createClient({
  //   url: argv.trustedSubgraphEndpoint,
  //   fetch,
  //   requestPolicy: 'network-only',
  // })
  //
  // // POI Checker
  // const poiChecker = new PoiChecker(provider, trustedSubgraph)

  let disputesModel = undefined
  if (argv.postgresHost) {
    // Use port 5432 by default
    const port = argv.postgresPort || 5432

    // Connect to the database
    const sequelize = new Sequelize({
      dialect: 'postgres',
      host: argv.postgresHost,
      port,
      username: argv.postgresUsername,
      password: argv.postgresPassword,
      database: argv.postgresDatabase,
      pool: {
        max: 10,
        min: 0,
      },
    })

    // Test the connection
    await sequelize.authenticate()
    disputesModel = definePOIDisputeModels(sequelize)
    await sequelize.models.POIDispute.sync()
  }

  return {
    provider,
    contracts,
    networkSubgraph,
    trustedPOICheckers,
    disputesModel,
  }
}
