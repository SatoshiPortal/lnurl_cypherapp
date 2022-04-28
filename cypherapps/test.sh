#!/bin/bash

timeout_feature() {
  local interval=10
  local totaltime=60
  local testwhat=${1}
  local returncode
  local endtime=$(($(date +%s) + ${totaltime}))

  while :
  do
    eval ${testwhat}
    returncode=$?

    # If no error or 2 minutes passed, we get out of this loop
    ([ "${returncode}" -eq "0" ] || [ $(date +%s) -gt ${endtime} ]) && break

    printf "\e[1;31mMaybe it's too early, I'll retry every ${interval} seconds for $((${totaltime} / 60)) minutes ($((${endtime} - $(date +%s))) seconds left).\e[1;0m\r\n"

    sleep ${interval}
  done

  return ${returncode}
}

do_test() {
  local rc
  rc=$(curl -k -s -o /dev/null -w "%{http_code}" https://127.0.0.1:${TRAEFIK_HTTPS_PORT}/lnurl/api/)
  [ "${rc}" -ne "200" ] && return 400
  return 0
}

export TRAEFIK_HTTPS_PORT

timeout_feature do_test
returncode=$?

# return 0: tests cool
# return 1: tests failed
return $returncode
