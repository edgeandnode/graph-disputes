import treeify from 'treeify'
import { DisputeManager } from '@graphprotocol/contracts/dist/types/DisputeManager'

import { log } from './logging'
import { populateEntry } from './dispute'
import { Environment } from './env'
import { getDispute } from './model'
import { waitTransaction } from './network'
import { askConfirm } from './utils'

const confirmResolve = (
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
    this.disputeManager = env.contracts.disputeManager
  }

  async showResolution(disputeID: string): Promise<void> {
    const { networkSubgraph } = this.env

    const dispute = await getDispute(networkSubgraph, disputeID)
    const disputeEntry = await populateEntry(dispute, this.env, true)
    log.info(treeify.asTree(disputeEntry, true, true))

    // TODO: show how much the indexer will be slashed
    // TODO: show the bond the fisherman will get
  }

  @confirmResolve
  async accept(disputeID: string): Promise<void> {
    log.info(`Accepting dispute ${disputeID}...`)
    const tx = await this.disputeManager
      .connect(this.env.account)
      .acceptDispute(disputeID)
    await waitTransaction(tx)
  }

  @confirmResolve
  async reject(disputeID: string): Promise<void> {
    log.info(`Rejecting dispute ${disputeID}...`)
    const tx = await this.disputeManager
      .connect(this.env.account)
      .rejectDispute(disputeID)
    await waitTransaction(tx)
  }

  @confirmResolve
  async draw(disputeID: string): Promise<void> {
    log.info(`Drawing dispute ${disputeID}...`)
    const tx = await this.disputeManager
      .connect(this.env.account)
      .drawDispute(disputeID)
    await waitTransaction(tx)
  }
}
