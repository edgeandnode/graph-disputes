/* eslint-disable @typescript-eslint/no-explicit-any */

import { Argv } from 'yargs'
import { providers } from 'ethers'
import fetch from 'isomorphic-fetch'
import { Client, createClient } from '@urql/core'
import { NetworkContracts, connectContracts } from '@graphprotocol/common-ts'

export interface Environment {
  provider: providers.Provider
  contracts: NetworkContracts
  networkSubgraph: Client
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

  // Subgraph
  const networkSubgraph = createClient({
    url: argv.networkSubgraphEndpoint,
    fetch,
    requestPolicy: 'network-only',
  })

  return {
    provider,
    contracts,
    networkSubgraph,
  }
}
