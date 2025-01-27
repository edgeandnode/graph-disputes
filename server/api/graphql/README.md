# GraphQL requests against the network subgraph.

Requests in this module are used to enrich disputes and validate data provided by indexers:
    
    1. Ensure that the poi an indexer is supplying for a dispute matches what is on chain.
    2. Verify that the entities an indexer supplies can be hashed to a public poi

Caveats:
* May need to submit API calls with the signature of an indexers wallet to prove veracity of uploaded data
* Current GQL client is blocking. Refactor to use an `asyncio` implementation. 