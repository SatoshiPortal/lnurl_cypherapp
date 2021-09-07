#!/bin/sh

# Mine
mine() {
  local nbblocks=${1:-1}
  local interactive=${2:-1}
  local minedaddr

  if [ "${interactive}" = "1" ]; then
    interactivearg="-it"
  fi
  echo ; echo "About to mine ${nbblocks} block(s)..."
  minedaddr=$(docker exec ${interactivearg} $(docker ps -q -f "name=cyphernode_bitcoin") bitcoin-cli -rpcwallet=spending01.dat getnewaddress | tr -d '\r')
  echo ; echo "minedaddr=${minedaddr}"
  docker exec ${interactivearg} $(docker ps -q -f "name=cyphernode_bitcoin") bitcoin-cli -rpcwallet=spending01.dat generatetoaddress ${nbblocks} "${minedaddr}"
}

case "${0}" in *mine.sh) mine $@;; esac
