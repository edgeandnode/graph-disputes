/* eslint-disable @typescript-eslint/no-empty-interface */

// NOTE: Sequelize is not installed as a dependency and this file is unused
// Commenting out imports to allow compilation
// import { Optional, Model, DataTypes, Sequelize } from 'sequelize'
type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>
abstract class Model<T, U> {
  toJSON?(): any
  static init?: any
}
const DataTypes = {
  STRING: 'STRING',
  INTEGER: 'INTEGER',
  BOOLEAN: 'BOOLEAN',
  DATE: 'DATE',
  TEXT: 'TEXT',
} as any
type Sequelize = any

export interface POIDisputeAttributes {
  indexer: string
  fisherman: string
  subgraphDeploymentID: string
  trustedIndexer: string
  allocationID: string
  proof: string
  createdStartBlockNumber: number
  createdStartBlockReferenceProof: string
  createdEpoch: number
  createdEpochStartBlockNumber: number
  createdEpochReferenceProof: string
  closedEpoch: number
  closedEpochStartBlockNumber: number
  closedEpochReferenceProof: string
  previousEpoch: number
  previousEpochStartBlockNumber: number
  previousEpochReferenceProof: string
  previousPreviousEpoch: number
  previousPreviousEpochStartBlockNumber: number
  previousPreviousEpochReferenceProof: string
  status: string
}

export interface POIDisputeCreationAttributes
  extends Optional<
    POIDisputeAttributes,
    | 'indexer'
    | 'fisherman'
    | 'subgraphDeploymentID'
    | 'trustedIndexer'
    | 'allocationID'
    | 'proof'
    | 'createdStartBlockNumber'
    | 'createdStartBlockReferenceProof'
    | 'createdEpoch'
    | 'createdEpochStartBlockNumber'
    | 'createdEpochReferenceProof'
    | 'closedEpoch'
    | 'closedEpochStartBlockNumber'
    | 'closedEpochReferenceProof'
    | 'previousEpoch'
    | 'previousEpochStartBlockNumber'
    | 'previousEpochReferenceProof'
    | 'previousPreviousEpoch'
    | 'previousPreviousEpochStartBlockNumber'
    | 'previousPreviousEpochReferenceProof'
    | 'status'
  > {}

export class POIDispute
  extends Model<POIDisputeAttributes, POIDisputeCreationAttributes>
  implements POIDisputeAttributes
{
  public indexer!: string
  public fisherman!: string
  public subgraphDeploymentID!: string
  public trustedIndexer!: string
  public allocationID!: string
  public proof!: string
  public createdStartBlockNumber!: number
  public createdStartBlockReferenceProof!: string
  public createdEpoch!: number
  public createdEpochStartBlockNumber!: number
  public createdEpochReferenceProof!: string
  public closedEpoch!: number
  public closedEpochStartBlockNumber!: number
  public closedEpochReferenceProof!: string
  public previousEpoch!: number
  public previousEpochStartBlockNumber!: number
  public previousEpochReferenceProof!: string
  public previousPreviousEpoch!: number
  public previousPreviousEpochStartBlockNumber!: number
  public previousPreviousEpochReferenceProof!: string
  public status!: string

  public createdAt!: Date
  public updatedAt!: Date

  // eslint-disable-next-line @typescript-eslint/ban-types
  public toGraphQL(): object {
    return { ...this.toJSON(), __typename: 'POIDispute' }
  }
}

export interface POIDisputeModels {
  POIDispute: typeof POIDispute
}

export const definePOIDisputeModels = (
  sequelize: Sequelize,
): POIDisputeModels => {
  POIDispute.init(
    {
      indexer: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      fisherman: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      subgraphDeploymentID: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      trustedIndexer: {
        type: DataTypes.STRING,
        unique: 'unique',
        allowNull: false,
      },
      allocationID: {
        type: DataTypes.STRING,
        unique: 'unique',
        allowNull: false,
      },
      proof: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      createdStartBlockNumber: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      createdStartBlockReferenceProof: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      createdEpoch: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      createdEpochStartBlockNumber: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      createdEpochReferenceProof: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      closedEpoch: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      closedEpochStartBlockNumber: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      closedEpochReferenceProof: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      previousEpoch: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      previousEpochStartBlockNumber: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      previousEpochReferenceProof: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      previousPreviousEpoch: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      previousPreviousEpochStartBlockNumber: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      previousPreviousEpochReferenceProof: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      status: {
        type: DataTypes.STRING,
        allowNull: false,
      },
    },
    {
      modelName: 'POIDispute',
      sequelize,
    },
  )

  return {
    ['POIDispute']: POIDispute,
  }
}
