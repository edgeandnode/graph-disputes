import { describe, it, beforeEach, afterEach } from 'mocha'
import { expect } from 'chai'
import sinon from 'sinon'

// Import the handler and dependencies to mock
import {
  createIndexingDisputeCommand,
  createQueryDisputeCommand,
} from '../src/commands/create'
import * as utils from '../src/utils'
import * as network from '../src/network'
import { generateAttestationData } from '@graphprotocol/toolshed'
import { ethers } from 'ethers'

describe('Dispute Creation Commands', () => {
  let stubs: sinon.SinonStub[]

  beforeEach(() => {
    stubs = []
  })

  afterEach(() => {
    // Restore all stubs after each test
    stubs.forEach(stub => stub.restore())
    sinon.restore()
  })

  it('should successfully create indexing dispute on happy path', async () => {
    // 1. Mock contract methods
    const mockCreateIndexingDispute = sinon
      .stub()
      .resolves({ hash: '0x123abc' })
    const mockDisputeDeposit = sinon.stub().resolves('10000000000000000000000')
    const mockGetAllocation = sinon.stub().resolves({
      indexer: '0xindexer123',
      createdAt: 12345,
    })

    // 2. Mock contracts object
    const mockContracts = {
      DisputeManager: {
        disputeDeposit: mockDisputeDeposit,
        connect: sinon.stub().returns({
          createIndexingDispute: mockCreateIndexingDispute,
        }),
        target: { toString: () => '0xdisputemanager123' },
      },
      SubgraphService: {
        getAllocation: mockGetAllocation,
      },
      GraphToken: {}, // Mock GraphToken for approval
    }

    // 3. Mock other dependencies
    const askConfirmStub = sinon.stub(utils, 'askConfirm').resolves(true)
    const approveStub = sinon.stub(network, 'approveIfRequired').resolves(null)
    const waitTxStub = sinon.stub(network, 'waitTransaction').resolves()

    stubs.push(askConfirmStub, approveStub, waitTxStub)

    // 4. Create test argv
    const testArgv = {
      env: {
        provider: {
          // Mock JsonRpcProvider methods if needed
        },
        contracts: mockContracts,
      },
      allocationID: '0xallocation123',
      poi: '0xpoi123',
      blockNumber: 12345,
      account:
        '0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
    }

    // 5. Execute the handler
    await createIndexingDisputeCommand.handler(testArgv as any)

    // 6. Verify the right calls were made
    expect(mockGetAllocation.calledWith('0xallocation123')).to.be.true
    expect(askConfirmStub.called).to.be.true
    expect(approveStub.called).to.be.true
    expect(
      mockCreateIndexingDispute.calledWith(
        '0xallocation123',
        '0xpoi123',
        12345,
      ),
    ).to.be.true
    expect(waitTxStub.called).to.be.true
  })

  it('should successfully create query dispute on happy path', async () => {
    // 1. Generate realistic test data
    const requestCID = ethers.keccak256(
      ethers.toUtf8Bytes('test-query-request'),
    )
    const responseCID = ethers.keccak256(
      ethers.toUtf8Bytes('test-query-response'),
    )
    const subgraphDeploymentId = ethers.keccak256(
      ethers.toUtf8Bytes('test-subgraph-deployment'),
    )
    const signerPrivateKey =
      '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'
    const disputeManagerAddress = '0x1234567890123456789012345678901234567890'
    const chainId = 1

    // 2. Generate real attestation data using toolshed
    const attestationData = await generateAttestationData(
      requestCID,
      responseCID,
      subgraphDeploymentId,
      signerPrivateKey,
      disputeManagerAddress,
      chainId,
    )

    // 3. Mock network and provider
    const mockProvider = {
      getNetwork: sinon.stub().resolves({ chainId: chainId }),
    }

    // 4. Mock contract methods
    const mockCreateQueryDispute = sinon.stub().resolves({ hash: '0x456def' })
    const mockDisputeDeposit = sinon.stub().resolves('10000000000000000000000')
    const mockGetAllocation = sinon.stub().resolves({
      indexer: '0xindexer789',
      createdAt: 67890,
    })

    // 5. Mock contracts object
    const mockContracts = {
      DisputeManager: {
        disputeDeposit: mockDisputeDeposit,
        connect: sinon.stub().returns({
          createQueryDispute: mockCreateQueryDispute,
        }),
        target: { toString: () => disputeManagerAddress },
      },
      SubgraphService: {
        getAllocation: mockGetAllocation,
      },
      GraphToken: {},
    }

    // 6. Mock other dependencies
    const askConfirmStub = sinon.stub(utils, 'askConfirm').resolves(true)
    const approveStub = sinon.stub(network, 'approveIfRequired').resolves(null)
    const waitTxStub = sinon.stub(network, 'waitTransaction').resolves()

    stubs.push(askConfirmStub, approveStub, waitTxStub)

    // 7. Create test argv with real attestation data
    const testArgv = {
      env: {
        provider: mockProvider,
        contracts: mockContracts,
      },
      attestation: ethers.hexlify(attestationData),
      account:
        '0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
    }

    // 8. Execute the handler - should now succeed with real attestation data
    await createQueryDisputeCommand.handler(testArgv as any)

    // 9. Verify the complete flow was executed
    expect(mockProvider.getNetwork.called).to.be.true
    expect(mockDisputeDeposit.called).to.be.true
    expect(mockGetAllocation.called).to.be.true
    expect(askConfirmStub.called).to.be.true
    expect(approveStub.called).to.be.true
    expect(mockCreateQueryDispute.calledWith(ethers.hexlify(attestationData)))
      .to.be.true
    expect(waitTxStub.called).to.be.true
  })
})
