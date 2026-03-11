library(httr)
library(jsonlite)
library(purrr)

url1 = "https://indexer.gunu-node.com/status"
deployment = "Qme9hQY1NZ8ReVDSSQb893s2fGpeLkgfwXd3YU5rndACaP"
start_block = 34436099
end_block = 38436099

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
  
  # increment query count
  queries = queries + 1
  
  if (!is.null(poi1) && length(poi1) > 0) {
    cat(sprintf("Block %d, POI: %s\n", mid, poi1))
    low = mid + 1
  } else {
    cat(sprintf("Block %d, POI: --NULL--\n", mid))
    if (mid == low ) {
      break
    }
    high = mid - 1
  }
}
last_poi = 0
if (low > high) {
  last_poi = high
} else {
  last_poi = high - 1
}
cat(sprintf("Last POI found at block %d\n", last_poi))

total_end_time = Sys.time()  # End timing for the entire process
total_duration = total_end_time - total_start_time  # Calculate total duration

cat(sprintf("Total elapsed time: %f seconds\n", as.numeric(total_duration)))
cat(sprintf("Number of queries performed: %f \n", as.numeric(queries)))