#!/bin/bash

ln_reconnect() {

  # First ping the containers to make sure they're up...
  docker run --rm -it --name ln-reconnecter --network cyphernodenet alpine sh -c '
  while true ; do ping -c 1 lightning ; [ "$?" -eq "0" ] && break ; sleep 5; done
  while true ; do ping -c 1 lightning2 ; [ "$?" -eq "0" ] && break ; sleep 5; done
  '

  local ln_getinfo
  local ln2_getinfo

  # Now check if the lightning nodes are ready to accept requests...
  while true ; do docker exec -it `docker ps -q -f "name=lightning\."` lightning-cli --lightning-dir=/.lightning getinfo ; [ "$?" -eq "0" ] && break ; sleep 5; done
  ln_getinfo=$(docker exec -it `docker ps -q -f "name=lightning\."` lightning-cli --lightning-dir=/.lightning getinfo)
  while true ; do docker exec -it `docker ps -q -f "name=lightning2\."` lightning-cli --lightning-dir=/.lightning getinfo ; [ "$?" -eq "0" ] && break ; sleep 5; done
  ln2_getinfo=$(docker exec -it `docker ps -q -f "name=lightning2\."` lightning-cli --lightning-dir=/.lightning getinfo)

  # Ok, let's reconnect them!
  local id id2 port port2
  id=$(echo "$ln_getinfo" | jq -r ".id")
  id2=$(echo "$ln2_getinfo" | jq -r ".id")
  port=$(echo "$ln_getinfo" | jq -r ".binding[0].port")
  port2=$(echo "$ln2_getinfo" | jq -r ".binding[0].port")

  docker exec -it `docker ps -q -f "name=lightning2\."` lightning-cli --lightning-dir=/.lightning connect $id@lightning:$port
  docker exec -it `docker ps -q -f "name=lightning\."` lightning-cli --lightning-dir=/.lightning connect $id2@lightning2:$port2
}

case "${0}" in *ln_reconnect.sh) ln_reconnect $@;; esac
