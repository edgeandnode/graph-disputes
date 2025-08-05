/* eslint-disable @typescript-eslint/no-explicit-any */

import { Argv } from 'yargs'
import { Wallet, JsonRpcProvider } from 'ethers'
import fetch from 'isomorphic-fetch'
import { Client, createClient } from '@urql/core'
import {
  connectGraphHorizon,
  connectSubgraphService,
  GraphHorizonContracts,
  SubgraphServiceContracts,
} from '@graphprotocol/toolshed/deployments'

import { PoiChecker } from './poi'

export interface Environment {
  provider: JsonRpcProvider
  contracts: GraphHorizonContracts & SubgraphServiceContracts
  networkSubgraph: Client
  trustedSubgraph: Client
  poiChecker: PoiChecker
  account?: Wallet
}

export const setupEnv = async (
  argv: { [key: string]: any } & Argv['argv'],
): Promise<Environment> => {
  // Ethereum
  let ethereum: URL
  try {
    ethereum = new URL(argv.ethereum)
  } catch (err) {
    console.error(`Invalid Ethereum URL ${argv.ethereum}`)
    throw err
  }

  const provider = new JsonRpcProvider(ethereum.toString())
  const network = await provider.getNetwork()

  // Address books are optional
  const horizonAddressBook = argv.horizonAddressBook
  const subgraphServiceAddressBook = argv.subgraphServiceAddressBook

  // Contracts
  let contracts: GraphHorizonContracts & SubgraphServiceContracts
  try {
    const horizonContracts = connectGraphHorizon(
      Number(network.chainId),
      provider,
      horizonAddressBook,
    )
    const subgraphServiceContracts = connectSubgraphService(
      Number(network.chainId),
      provider,
      subgraphServiceAddressBook,
    )
    contracts = {
      ...horizonContracts,
      ...subgraphServiceContracts,
    }
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

  // Trusted Proof Subgraph
  const trustedSubgraph = createClient({
    url: argv.trustedSubgraphEndpoint,
    fetch,
    requestPolicy: 'network-only',
  })

  // POI Checker
  const poiChecker = new PoiChecker(provider, trustedSubgraph)

  // Load account if present
  const account = argv.account && new Wallet(argv.account, provider)

  return {
    provider,
    contracts,
    networkSubgraph,
    trustedSubgraph,
    poiChecker,
    account,
  }
}
