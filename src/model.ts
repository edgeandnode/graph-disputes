/* eslint-disable @typescript-eslint/no-explicit-any */

import { Client } from '@urql/core'
import gql from 'graphql-tag'

export const getDisputes = async (networkSubgraph: Client): Promise<any> => {
  const result = await networkSubgraph
    .query(
      gql`
        {
          disputes(orderBy: "createdAt", orderDirection: "asc") {
            id
            type
            status
            indexer {
              id
            }
            fisherman {
              id
            }
          }
        }
      `,
    )
    .toPromise()
  return result.data.disputes
}

export const getDispute = async (
  networkSubgraph: Client,
  disputeID: string,
): Promise<any> => {
  const result = await networkSubgraph
    .query(
      gql`
        query($disputeID: String!) {
          dispute(id: $disputeID) {
            id
            type
            status
            indexer {
              id
            }
            fisherman {
              id
            }
          }
        }
      `,
      { disputeID },
    )
    .toPromise()
  return result.data.dispute
}
