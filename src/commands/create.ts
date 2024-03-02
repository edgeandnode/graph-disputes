// function createIndexingDispute(address _allocationID, uint256 _deposit)

/* eslint-disable @typescript-eslint/no-explicit-any */

import { constants, Wallet } from 'ethers'
import yargs, { Argv } from 'yargs'
import {
  parseGRT,
  Attestation,
  decodeAttestation,
  recoverAttestation,
  NetworkContracts,
} from '@graphprotocol/common-ts'

import { addDefaultArgOptions } from '../config'
import { log } from '../logging'
import { approveIfRequired, waitTransaction } from '../network'
import { askConfirm } from '../utils'

const { AddressZero } = constants

const validateAllocation = async (
  contracts: NetworkContracts,
  allocationID: string,
): Promise<string> => {
  const allocation = await contracts.staking.getAllocation(allocationID)
  if (allocation.indexer === AddressZero) {
    throw new Error(`Allocation ${allocationID} not found in the contracts`)
  }
  return allocation.indexer
}

export const createIndexingDisputeCommand = {
  command: 'indexing <allocationID> <deposit>',
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
        .positional('deposit', { type: 'string' }),
    )
  },
  handler: async (
    argv: { [key: string]: any } & Argv['argv'],
  ): Promise<void> => {
    // Parse arguments
    const { provider, contracts } = argv.env
    const allocationID = argv.allocationID
    const deposit = argv.deposit
    const depositWei = parseGRT(deposit)
    const sender = new Wallet(argv.account, provider)

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
        contracts.token,
        sender,
        contracts.disputeManager.address,
        depositWei,
      )
      log.info(
        approvalReceipt ? 'Deposit approved' : 'Skipped approval, not needed',
      )

      // Dispute
      log.info(`Disputing ${allocationID}...`)
      const tx = await contracts.disputeManager
        .connect(sender)
        .createIndexingDispute(allocationID, depositWei)
      await waitTransaction(tx)
    } catch (err) {
      log.error(err.message)
    }
  },
}

export const createQueryDisputeCommand = {
  command: 'query <attestation> <deposit>',
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
        .positional('deposit', { type: 'string' }),
    )
  },
  handler: async (
    argv: { [key: string]: any } & Argv['argv'],
  ): Promise<void> => {
    // Parse arguments
    const { provider, contracts } = argv.env
    const attestationBytes = argv.attestation
    const deposit = argv.deposit
    const depositWei = parseGRT(deposit)
    const sender = new Wallet(argv.account, provider)

    try {
      // Decode attestation
      log.info('## Decoding attestation')
      const attestation: Attestation = decodeAttestation(attestationBytes)
      log.info(attestation)

      // Recover signature
      log.info('## Recovering signer')
      const chainId = await provider.getNetwork().then(n => n.chainId)
      const allocationID = recoverAttestation(
        chainId,
        contracts.disputeManager.address,
        attestation,
        '0',
      )
      log.info('AllocationID: ${allocationID}')

      // Look for allocation and indexer address
      log.info(`## Looking for on-chain allocation data`)
      const indexerAddress = await validateAllocation(contracts, allocationID)
      log.info('Indexer: ${indexerAddress}')

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
        contracts.token,
        sender,
        contracts.disputeManager.address,
        depositWei,
      )
      log.info(
        approvalReceipt ? 'Deposit approved' : 'Skipped approval, not needed',
      )

      // Dispute
      log.info(`## Disputing ${indexerAddress}...`)
      const tx = await contracts.disputeManager
        .connect(sender)
        .createQueryDispute(attestationBytes, depositWei)
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
