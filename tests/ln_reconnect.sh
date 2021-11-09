#!/bin/sh

ln_reconnect() {

  # First ping the containers to make sure they're up...
  docker run --rm -it --name ln-reconnecter --network cyphernodenet alpine sh -c '
  while true ; do ping -c 1 cyphernode_lightning ; [ "$?" -eq "0" ] && break ; sleep 5; done
  while true ; do ping -c 1 cyphernode_lightning2 ; [ "$?" -eq "0" ] && break ; sleep 5; done
  '

  # Now check if the lightning nodes are ready to accept requests...
  while true ; do docker exec -it `docker ps -q -f "name=lightning\."` lightning-cli --lightning-dir=/.lightning getinfo ; [ "$?" -eq "0" ] && break ; sleep 5; done
  while true ; do docker exec -it `docker ps -q -f "name=lightning2\."` lightning-cli --lightning-dir=/.lightning getinfo ; [ "$?" -eq "0" ] && break ; sleep 5; done

  # Ok, let's reconnect them!
  docker exec -it `docker ps -q -f "name=lightning2\."` lightning-cli --lightning-dir=/.lightning connect $(echo "$(docker exec -it `docker ps -q -f "name=lightning\."` lightning-cli --lightning-dir=/.lightning getinfo | jq -r ".id")@lightning")
  docker exec -it `docker ps -q -f "name=lightning\."` lightning-cli --lightning-dir=/.lightning connect $(echo "$(docker exec -it `docker ps -q -f "name=lightning2\."` lightning-cli --lightning-dir=/.lightning getinfo | jq -r ".id")@lightning2")
}

case "${0}" in *ln_reconnect.sh) ln_reconnect $@;; esac
