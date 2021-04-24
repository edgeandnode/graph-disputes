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

import { setupEnv } from '../env'
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
    return yargs
      .option('account', {
        description: 'Ethereum account',
        type: 'string',
        required: true,
        group: 'Ethereum',
      })
      .positional('allocationID', { type: 'string' })
      .positional('deposit', { type: 'string' })
  },
  handler: async (
    argv: { [key: string]: any } & Argv['argv'],
  ): Promise<void> => {
    const { provider, contracts } = await setupEnv(argv)

    // Parse arguments
    const allocationID = argv.allocationID
    const deposit = argv.deposit
    const depositWei = parseGRT(deposit)
    const sender = new Wallet(argv.account, provider)

    try {
      // Look for allocation and indexer address
      console.log(`## Looking for on-chain allocation data`)
      const indexerAddress = await validateAllocation(contracts, allocationID)
      console.log('Indexer:', indexerAddress, '\n')

      // Confirm
      if (
        !(await askConfirm(
          `Confirm dispute:\n\tIndexer: ${indexerAddress}\n\tAllocation: ${allocationID}\n\tDeposit: ${deposit} GRT`,
        ))
      ) {
        process.exit(1)
      }

      // Approve
      console.log(`Approving ${deposit} GRT...`)
      const approvalReceipt = await approveIfRequired(
        contracts.token,
        sender,
        contracts.disputeManager.address,
        depositWei,
      )
      console.log(
        approvalReceipt ? 'Deposit approved' : 'Skipped approval, not needed',
      )

      // Dispute
      console.log(`Disputing ${allocationID}...`)
      const tx = await contracts.disputeManager
        .connect(sender)
        .createIndexingDispute(allocationID, depositWei)
      await waitTransaction(tx)
    } catch (err) {
      console.log(err.message)
    }
  },
}

export const createQueryDisputeCommand = {
  command: 'query <attestation> <deposit>',
  describe: 'Create query dispute',
  builder: (yargs: Argv): Argv => {
    return yargs
      .option('account', {
        description: 'Ethereum account',
        type: 'string',
        required: true,
        group: 'Ethereum',
      })
      .positional('attestation', { type: 'string' })
      .positional('deposit', { type: 'string' })
  },
  handler: async (
    argv: { [key: string]: any } & Argv['argv'],
  ): Promise<void> => {
    const { provider, contracts } = await setupEnv(argv)

    // Parse arguments
    const attestationBytes = argv.attestation
    const deposit = argv.deposit
    const depositWei = parseGRT(deposit)
    const sender = new Wallet(argv.account, provider)

    try {
      // Decode attestation
      console.log('## Decoding attestation')
      const attestation: Attestation = decodeAttestation(attestationBytes)
      console.log(attestation, '\n')

      // Recover signature
      console.log('## Recovering signer')
      const chainId = await provider.getNetwork().then(n => n.chainId)
      const allocationID = recoverAttestation(
        chainId,
        contracts.disputeManager.address,
        attestation,
      )
      console.log('AllocationID:', allocationID, '\n')

      // Look for allocation and indexer address
      console.log(`## Looking for on-chain allocation data`)
      const indexerAddress = await validateAllocation(contracts, allocationID)
      console.log('Indexer:', indexerAddress, '\n')

      // Confirm
      if (
        !(await askConfirm(
          `Confirm dispute:\n\tIndexer: ${indexerAddress}\n\tAllocation: ${allocationID}\n\tDeposit: ${deposit} GRT`,
        ))
      ) {
        process.exit(1)
      }

      // Approve
      console.log(`## Approving ${deposit} GRT...`)
      const approvalReceipt = await approveIfRequired(
        contracts.token,
        sender,
        contracts.disputeManager.address,
        depositWei,
      )
      console.log(
        approvalReceipt ? 'Deposit approved' : 'Skipped approval, not needed',
      )

      // Dispute
      console.log(`## Disputing ${indexerAddress}...`)
      const tx = await contracts.disputeManager
        .connect(sender)
        .createQueryDispute(attestationBytes, depositWei)
      await waitTransaction(tx)
    } catch (err) {
      console.log(err.message)
    }
  },
}

export const createCommand = {
  command: 'create',
  describe: 'Create dispute',
  builder: (yargs: Argv): Argv => {
    return yargs
      .command(createIndexingDisputeCommand)
      .command(createQueryDisputeCommand)
  },
  handler: async (): Promise<void> => {
    yargs.showHelp()
  },
}
