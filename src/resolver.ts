import { TransactionReceipt, TransactionRequest } from 'ethers'
import treeify from 'object-treeify'
import ora from 'ora'
import chalk from 'chalk'
import { DisputeManager } from '@graphprotocol/subgraph-service'

import { log } from './logging'
import { populateEntry, isDisputeOlderThanTwoThawingPeriods } from './dispute'
import { Environment } from './env'
import { getDispute, getNetworkSettings } from './model'
import { waitTransaction } from './network'
import { askConfirm, treeifyFormat } from './utils'

enum DisputeResolution {
  Accept = 1,
  AcceptConflict,
  Reject,
  Draw,
}

const disputeResolutionCalls: Map<DisputeResolution, string> = new Map([
  [DisputeResolution.Accept, 'acceptDispute(bytes32,uint256)'],
  [
    DisputeResolution.AcceptConflict,
    'acceptDisputeConflict(bytes32,uint256,bool,uint256)',
  ],
  [DisputeResolution.Reject, 'rejectDispute(bytes32)'],
  [DisputeResolution.Draw, 'drawDispute(bytes32)'],
])

const confirmResolve = (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  target: any,
  propertyKey: string,
  descriptor: PropertyDescriptor,
) => {
  const originalMethod = descriptor.value

  // Wrap the resolve function
  descriptor.value = async function (...args) {
    // Parse function arguments
    const [disputeID] = args

    // Show dispute details
    const self = this as DisputeResolver
    await self.showResolution(disputeID)

    // Confirm
    if (
      !(await askConfirm(
        `You are about to resolve dispute ${disputeID}, confirm?`,
      ))
    ) {
      return
    }

    // Resolve
    return originalMethod.apply(this, args)
  }
  return descriptor
}

export class DisputeResolver {
  env: Environment
  disputeManager: DisputeManager

  constructor(env: Environment) {
    this.env = env
    this.disputeManager = env.contracts.DisputeManager
  }

  async showResolution(disputeID: string): Promise<void> {
    const spinner = ora('Loading dispute...\n').start()
    const dispute = await getDispute(this.env.networkSubgraph, disputeID)
    const networkSettings = await getNetworkSettings(this.env.networkSubgraph)
    const disputeEntry = await populateEntry(
      dispute,
      this.env,
      networkSettings,
      true,
    )
    spinner.stop()

    log.info(treeify(disputeEntry, treeifyFormat))

    // TODO: show how much the indexer will be slashed
    // TODO: show the bond the submitter will get
  }

  async validateStatuteOfLimitations(disputeID: string): Promise<boolean> {
    const dispute = await getDispute(this.env.networkSubgraph, disputeID)
    const networkSettings = await getNetworkSettings(this.env.networkSubgraph)

    // Query disputes don't have an allocation associated with them so we can't check the statute of limitations
    if (!dispute.allocation) {
      return true
    }

    return !isDisputeOlderThanTwoThawingPeriods(
      dispute.allocation.closedAtEpoch,
      networkSettings,
    )
  }

  showStatuteOfLimitationsError(): void {
    const message = chalk.redBright(`
    This dispute cannot be accepted or rejected because its allocation closed more than 2 thawing periods ago.
    For more information refer to the Arbitration Charter, Section 6: Statute of Limitations.
    `)
    log.error(message)
  }

  async commit(
    transaction: TransactionRequest,
    execute: boolean,
  ): Promise<TransactionReceipt | void> {
    // Execute transaction
    if (execute) {
      const tx = await this.env.account.sendTransaction(transaction)
      return waitTransaction(tx)
    }

    // Show transaction payload
    log.info(JSON.stringify(transaction, null, 2))
  }

  @confirmResolve
  async accept(
    disputeID: string,
    tokensSlash: bigint,
    execute = false,
  ): Promise<void> {
    log.info(`Accepting dispute ${disputeID}...`)
    if (!(await this.validateStatuteOfLimitations(disputeID))) {
      this.showStatuteOfLimitationsError()
      return
    }

    const transaction =
      await this.disputeManager.acceptDispute.populateTransaction(
        disputeID,
        tokensSlash,
      )
    await this.commit(transaction, execute)
  }

  @confirmResolve
  async acceptConflict(
    disputeID: string,
    tokensSlash: bigint,
    acceptDisputeInConflict: boolean,
    tokensSlashRelated: bigint,
    execute = false,
  ): Promise<void> {
    log.info(`Accepting conflict dispute ${disputeID}...`)
    if (!(await this.validateStatuteOfLimitations(disputeID))) {
      this.showStatuteOfLimitationsError()
      return
    }

    const transaction =
      await this.disputeManager.acceptDisputeConflict.populateTransaction(
        disputeID,
        tokensSlash,
        acceptDisputeInConflict,
        tokensSlashRelated,
      )
    await this.commit(transaction, execute)
  }

  @confirmResolve
  async reject(disputeID: string, execute = false): Promise<void> {
    log.info(`Rejecting dispute ${disputeID}...`)
    if (!(await this.validateStatuteOfLimitations(disputeID))) {
      this.showStatuteOfLimitationsError()
      return
    }

    const transaction =
      await this.disputeManager.rejectDispute.populateTransaction(disputeID)
    await this.commit(transaction, execute)
  }

  @confirmResolve
  async draw(disputeID: string, execute = false): Promise<void> {
    log.info(`Drawing dispute ${disputeID}...`)
    const transaction =
      await this.disputeManager.drawDispute.populateTransaction(disputeID)
    await this.commit(transaction, execute)
  }
}
