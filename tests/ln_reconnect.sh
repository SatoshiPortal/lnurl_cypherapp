#!/bin/sh

ln_reconnect() {
  docker exec -it `docker ps -q -f "name=lightning2\."` lightning-cli --lightning-dir=/.lightning connect $(echo "$(docker exec -it `docker ps -q -f "name=lightning\."` lightning-cli --lightning-dir=/.lightning getinfo | jq -r ".id")@lightning")
  docker exec -it `docker ps -q -f "name=lightning\."` lightning-cli --lightning-dir=/.lightning connect $(echo "$(docker exec -it `docker ps -q -f "name=lightning2\."` lightning-cli --lightning-dir=/.lightning getinfo | jq -r ".id")@lightning2")
}

case "${0}" in *ln_reconnect.sh) ln_reconnect $@;; esac
