## Process workflow of running through a dispute. 
\
 Web3 client
 --
 * Not asynchronous until `await_only` is implemented
 * Gathering matching events can take a long time \
 * **TODO:** need to determine the best way of constructing the web3/ipfs client. Long lived and passed around or spawned on new function calls? 


FSM
---
* Not currently using callbacks in the transitions package.
* Should probably remove this and just make everything depend on capturing state from the DB prior to each function invocation


