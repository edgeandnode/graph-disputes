#!/bin/bash
export DB_HOST=localhost
export DB_NAME=$(echo $(kubectl get secret graph-disputes-server-db-credentials -o jsonpath='{.data}') | jq '.name' \
                 | sed -e 's/^"//' -e 's/"$//' | base64 --decode)
export DB_PASS=$(echo $(kubectl get secret graph-disputes-server-db-credentials -o jsonpath='{.data}') | jq '.pass' \
                 | sed -e 's/^"//' -e 's/"$//' | base64 --decode)
export DB_USER=$(echo $(kubectl get secret graph-disputes-server-db-credentials -o jsonpath='{.data}') | jq '.user' \
                 | sed -e 's/^"//' -e 's/"$//' | base64 --decode)
export DB_PORT=3306                 