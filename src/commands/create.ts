// function createIndexingDispute(address _allocationID, uint256 _deposit)

/* eslint-disable @typescript-eslint/no-explicit-any */

import { JsonRpcProvider, Wallet } from 'ethers'
import yargs, { Argv } from 'yargs'
import {
  parseGRT,
  Attestation,
  decodeAttestation,
  recoverAttestation,
} from '@graphprotocol/common-ts'
import {
  GraphHorizonContracts,
  SubgraphServiceContracts,
} from '@graphprotocol/toolshed/deployments'

import { addDefaultArgOptions } from '../config'
import { log } from '../logging'
import { approveIfRequired, waitTransaction } from '../network'
import { askConfirm } from '../utils'

const validateAllocation = async (
  contracts: GraphHorizonContracts & SubgraphServiceContracts,
  allocationID: string,
): Promise<string> => {
  const allocation = await contracts.SubgraphService.getAllocation(allocationID)
  if (allocation.indexer === '0x0000000000000000000000000000000000000000') {
    throw new Error(`Allocation ${allocationID} not found in the contracts`)
  }
  return allocation.indexer
}

export const createIndexingDisputeCommand = {
  command: 'indexing <allocationID> <poi>',
  describe: 'Create indexing dispute',
  builder: (yargs: Argv): Argv => {
    return addDefaultArgOptions(
      yargs
        .option('account', {
          description: 'Ethereum account',
          type: 'string',
          required: true,
          group: 'Ethereum',
        })
        .positional('allocationID', { type: 'string' })
        .positional('poi', { type: 'string' }),
    )
  },
  handler: async (
    argv: { [key: string]: any } & Argv['argv'],
  ): Promise<void> => {
    // Parse arguments
    const { provider, contracts } = argv.env as {
      provider: JsonRpcProvider
      contracts: GraphHorizonContracts & SubgraphServiceContracts
    }
    const allocationID = argv.allocationID
    const poi = argv.poi
    const sender = new Wallet(argv.account, provider)
    const deposit = await contracts.DisputeManager.disputeDeposit()

    try {
      // Look for allocation and indexer address
      log.info(`## Looking for on-chain allocation data`)
      const indexerAddress = await validateAllocation(contracts, allocationID)
      log.info('Indexer:', indexerAddress, '\n')

      // Confirm
      if (
        !(await askConfirm(
          `Confirm dispute:\n\tIndexer: ${indexerAddress}\n\tAllocation: ${allocationID}\n\tDeposit: ${deposit} GRT`,
        ))
      ) {
        process.exit(1)
      }

      // Approve
      log.info(`Approving ${deposit} GRT...`)
      const approvalReceipt = await approveIfRequired(
        contracts.GraphToken,
        sender,
        contracts.DisputeManager.target.toString(),
        deposit,
      )
      log.info(
        approvalReceipt ? 'Deposit approved' : 'Skipped approval, not needed',
      )

      // Dispute
      log.info(`Disputing ${allocationID}...`)
      const tx = await contracts.DisputeManager.connect(
        sender,
      ).createIndexingDispute(allocationID, poi)
      await waitTransaction(tx)
    } catch (err) {
      log.error(err.message)
    }
  },
}

export const createQueryDisputeCommand = {
  command: 'query <attestation>',
  describe: 'Create query dispute',
  builder: (yargs: Argv): Argv => {
    return addDefaultArgOptions(
      yargs
        .option('account', {
          description: 'Ethereum account',
          type: 'string',
          required: true,
          group: 'Ethereum',
        })
        .positional('attestation', { type: 'string' })
    )
  },
  handler: async (
    argv: { [key: string]: any } & Argv['argv'],
  ): Promise<void> => {
    // Parse arguments
    const { provider, contracts } = argv.env as {
      provider: JsonRpcProvider
      contracts: GraphHorizonContracts & SubgraphServiceContracts
    }
    const DisputeManager = contracts.DisputeManager
    const attestationBytes = argv.attestation
    const deposit = await DisputeManager.disputeDeposit()
    const sender = new Wallet(argv.account, provider)
    const network = await provider.getNetwork()

    try {
      // Decode attestation
      log.info('## Decoding attestation')
      const attestation: Attestation = decodeAttestation(attestationBytes)
      log.info(JSON.stringify(attestation, null, 2))

      // Recover signature
      log.info('## Recovering signer')
      const allocationID = recoverAttestation(
        Number(network.chainId),
        DisputeManager.target.toString(),
        attestation,
        '0',
      )
      log.info(`AllocationID: ${allocationID}`)

      // Look for allocation and indexer address
      log.info(`## Looking for on-chain allocation data`)
      const indexerAddress = await validateAllocation(contracts, allocationID)
      log.info(`Indexer: ${indexerAddress}`)

      // Confirm
      if (
        !(await askConfirm(
          `Confirm dispute:\n\tIndexer: ${indexerAddress}\n\tAllocation: ${allocationID}\n\tDeposit: ${deposit} GRT`,
        ))
      ) {
        process.exit(1)
      }

      // Approve
      log.info(`## Approving ${deposit} GRT...`)
      const approvalReceipt = await approveIfRequired(
        contracts.GraphToken,
        sender,
        DisputeManager.target.toString(),
        deposit,
      )
      log.info(
        approvalReceipt ? 'Deposit approved' : 'Skipped approval, not needed',
      )

      // Dispute
      log.info(`## Disputing ${indexerAddress}...`)
      const tx = await contracts.DisputeManager.connect(
        sender,
      ).createQueryDispute(attestationBytes)
      await waitTransaction(tx)
    } catch (err) {
      log.error(err.message)
    }
  },
}

export const createCommand = {
  command: 'create',
  describe: 'Create dispute',
  builder: (yargs: Argv): Argv => {
    return addDefaultArgOptions(
      yargs
        .command(createIndexingDisputeCommand)
        .command(createQueryDisputeCommand),
    )
  },
  handler: async (): Promise<void> => {
    yargs.showHelp()
  },
}
