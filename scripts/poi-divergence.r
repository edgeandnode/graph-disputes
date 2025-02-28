library(httr)
library(jsonlite)
library(purrr)

# Find diverging block ----------------------------------------------------

# Set up the parameters - in future version can get urls from addresses with subgraph query
url1 = "https://indexer.upgrade.thegraph.com/status"
url2 = "https://indexer.gunu-node.com/status"
deployment = "QmUbSegbKWhJ4N98iRjfEpMiogGLF2cN77Uqqbd5NKm6g7"
start_block = 18900000
end_block = 19809111

# Initialize search range
low = start_block
high = end_block

total_start_time = Sys.time()  # Start timing for the entire process
queries = 0 # Start queries counter 

while (low <= high) {
  # Calculate midpoint
  mid = as.integer((low + high) / 2)
  
  # Construct the query
  query = sprintf('
  query {
    publicProofsOfIndexing(
      requests: [{deployment: "%s", blockNumber: %d}]
    ) {
      proofOfIndexing
    }
  }
  ', deployment, mid)
  
  # Query both endpoints
  response1 = POST(url1, body = list(query = query), encode = "json")
  data1 = content(response1, "text", encoding = "UTF-8")
  poi1 = fromJSON(data1, flatten = TRUE)$data$publicProofsOfIndexing$proofOfIndexing
  
  response2 = POST(url2, body = list(query = query), encode = "json")
  data2 = content(response2, "text", encoding = "UTF-8")
  poi2 = fromJSON(data2, flatten = TRUE)$data$publicProofsOfIndexing$proofOfIndexing
  # increment query count
  queries = queries + 1
  
  cat(sprintf("Checking block %d\n", mid))
  
  if (poi1 != poi2) {
    cat(sprintf("Divergence at or before block %d\n", mid))
    # Divergence found, check if it's the first diverging block
    if (mid == low || {
      query_prev = sprintf('
      query {
        publicProofsOfIndexing(
          requests: [{deployment: "%s", blockNumber: %d}]
        ) {
          proofOfIndexing
        }
      }
      ', deployment, mid - 1)
      
      resp1_prev = POST(url1, body = list(query = query_prev), encode = "json")
      poi1_prev = fromJSON(content(resp1_prev, "text", encoding = "UTF-8"), flatten = TRUE)$data$publicProofsOfIndexing$proofOfIndexing
      
      resp2_prev = POST(url2, body = list(query = query_prev), encode = "json")
      poi2_prev = fromJSON(content(resp2_prev, "text", encoding = "UTF-8"), flatten = TRUE)$data$publicProofsOfIndexing$proofOfIndexing
      
      poi1_prev == poi2_prev
    }) {
      cat(sprintf("Divergence found at block: %d \n", mid))
      cat(sprintf("POI from %s: %s\n", url1, poi1))
      cat(sprintf("POI from %s: %s\n", url2, poi2))
      break
    }
    # If not the first diverging block, continue searching in lower half
    high = mid - 1
  } else {
    cat(sprintf("No divergence at block %d - Continuing search\n", mid))
    # No divergence at this block, search in upper half
    low = mid + 1
  }
}

total_end_time = Sys.time()  # End timing for the entire process
total_duration = total_end_time - total_start_time  # Calculate total duration

cat(sprintf("Total elapsed time: %f seconds\n", as.numeric(total_duration)))
cat(sprintf("Number of queries performed: %f \n", as.numeric(queries)))

if (low > high) {
  cat("No divergence found in the specified range \n")
}

