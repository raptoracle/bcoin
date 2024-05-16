#!/bin/bash

dir=$(dirname "$(which "$0")")
url_main='https://raw.githubusercontent.com/Raptor3um/raptoreum/1de001dc3da6495956b49b9b3be6ec1e8249a6b0/contrib/seeds/nodes_main.txt'
url_testnet='https://raw.githubusercontent.com/Raptor3um/raptoreum/1de001dc3da6495956b49b9b3be6ec1e8249a6b0/contrib/seeds/nodes_test.txt'

getseeds() {
  echo "$(curl -s "$1")"
}

tojs() {
  local data=$(cat)
  local body=$(echo "$data" | head -n -1)
  local last=$(echo "$data" | tail -n 1)
  echo "'use strict';"
  echo ''
  echo 'module.exports = ['
  echo "$body" | while read line; do
    if echo "$line" | grep '^#' > /dev/null; then
      continue
    fi
    if echo "$line" | grep '^ *$' > /dev/null; then
      continue
    fi
    echo "  '${line}',"
  done
  echo "  '${last}'"
  echo '];'
}

getseeds "$url_main" | tojs > "${dir}/../lib/net/seeds/main.js"
getseeds "$url_testnet" | tojs > "${dir}/../lib/net/seeds/testnet.js"
