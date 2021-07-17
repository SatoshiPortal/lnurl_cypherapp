#!/bin/sh

# Mine
mine() {
  local nbblocks=${1:-1}
  local minedaddr

  echo ; echo "About to mine ${nbblocks} block(s)..."
  minedaddr=$(docker exec -it $(docker ps -q -f "name=cyphernode_bitcoin") bitcoin-cli -rpcwallet=spending01.dat getnewaddress | tr -d '\r')
  echo ; echo "minedaddr=${minedaddr}"
  docker exec -it $(docker ps -q -f "name=cyphernode_bitcoin") bitcoin-cli -rpcwallet=spending01.dat generatetoaddress ${nbblocks} "${minedaddr}"
}
