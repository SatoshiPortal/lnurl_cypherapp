#!/bin/bash

#
# This is a super basic LNURL-compatible wallet, command-line
# Useful to test LNURL on a regtest or testnet environment.
#

#
# This script assumes you have lightning and lightning2 running.
# It will use lightning2 as the destination wallet (user's wallet)
# It will use lightning as the source wallet (service's wallet)
#
# If you don't have a lnurl and want to create one to call withdraw:
#
# ./lnurl_withdraw_wallet.sh createlnurl
#
# If you have a lnurl string and want to withdraw it to your lightning2 node:
#
# ./lnurl_withdraw_wallet.sh <lnurl>
#
# If you have a lnurl string and want to withdraw it to a specific bolt11:
#
# ./lnurl_withdraw_wallet.sh <lnurl> <bolt11>
#

. ./colors.sh

trace() {
  if [ "${1}" -le "${TRACING}" ]; then
    echo -e "$(date -u +%FT%TZ) ${2}" 1>&2
  fi
}

start_test_container() {
  docker run -d --rm -it --name lnurl-withdraw-wallet --network=cyphernodeappsnet alpine
  docker network connect cyphernodenet lnurl-withdraw-wallet
}

stop_test_container() {
  trace 1 "\n\n[stop_test_container] ${BCyan}Stopping existing containers if they are running...${Color_Off}\n"

  local containers=$(docker ps -q -f "name=lnurl-withdraw-wallet")
  if [ -n "${containers}" ]; then
    docker stop $(docker ps -q -f "name=lnurl-withdraw-wallet")
  fi
}

exec_in_test_container() {
  docker exec -it lnurl-withdraw-wallet "$@" | tr -d '\r\n'
}

exec_in_test_container_leave_lf() {
  docker exec -it lnurl-withdraw-wallet "$@"
}

create_lnurl_withdraw() {
  trace 2 "\n\n[create_lnurl_withdraw] ${BCyan}Service creates LNURL Withdraw...${Color_Off}\n"

  local callbackurl=${1}
  trace 3 "[create_lnurl_withdraw] callbackurl=${callbackurl}"

  local invoicenumber=${3:-$RANDOM}
  trace 3 "[create_lnurl_withdraw] invoicenumber=${invoicenumber}"
  local msatoshi=$((500000+${invoicenumber}))
  trace 3 "[create_lnurl_withdraw] msatoshi=${msatoshi}"
  local expiration_offset=${2:-0}
  local expiration=$(exec_in_test_container date -d @$(($(date -u +"%s")+${expiration_offset})) +"%Y-%m-%dT%H:%M:%SZ")
  trace 3 "[create_lnurl_withdraw] expiration=${expiration}"
  local fallback_addr=${4:-""}
  local fallback_batched=${5:-"false"}

  # Service creates LNURL Withdraw
  data='{"id":0,"method":"createLnurlWithdraw","params":{"msatoshi":'${msatoshi}',"description":"desc'${invoicenumber}'","expiresAt":"'${expiration}'","webhookUrl":"'${callbackurl}'/lnurl/inv'${invoicenumber}'","btcFallbackAddress":"'${fallback_addr}'","batchFallback":'${fallback_batched}'}}'
  trace 3 "[create_lnurl_withdraw] data=${data}"
  trace 3 "[create_lnurl_withdraw] Calling createLnurlWithdraw..."
  local createLnurlWithdraw=$(exec_in_test_container curl -sd "${data}" -H "Content-Type: application/json" lnurl:8000/api)
  trace 3 "[create_lnurl_withdraw] createLnurlWithdraw=${createLnurlWithdraw}"

  # {"id":0,"result":{"msatoshi":100000000,"description":"desc01","expiresAt":"2021-07-15T12:12:23.112Z","secretToken":"abc01","webhookUrl":"https://webhookUrl01","lnurl":"LNURL1DP68GUP69UHJUMMWD9HKUW3CXQHKCMN4WFKZ7AMFW35XGUNPWAFX2UT4V4EHG0MN84SKYCESXYH8P25K","withdrawnDetails":null,"withdrawnTimestamp":null,"active":1,"lnurlWithdrawId":1,"createdAt":"2021-07-15 19:42:06","updatedAt":"2021-07-15 19:42:06"}}
  local lnurl=$(echo "${createLnurlWithdraw}" | jq -r ".result.lnurl")
  trace 3 "[create_lnurl_withdraw] lnurl=${lnurl}"

  echo "${createLnurlWithdraw}"
}

decode_lnurl() {
  trace 2 "\n\n[decode_lnurl] ${BCyan}Decoding LNURL...${Color_Off}\n"

  local lnurl=${1}

  local data='{"id":0,"method":"decodeBech32","params":{"s":"'${lnurl}'"}}'
  trace 3 "[decode_lnurl] data=${data}"
  local decodedLnurl=$(exec_in_test_container curl -sd "${data}" -H "Content-Type: application/json" lnurl:8000/api)
  trace 3 "[decode_lnurl] decodedLnurl=${decodedLnurl}"
  local url=$(echo "${decodedLnurl}" | jq -r ".result")
  trace 3 "[decode_lnurl] url=${url}"

  echo "${url}"
}

call_lnservice_withdraw_request() {
  trace 1 "\n[call_lnservice_withdraw_request] ${BCyan}User calls LN Service LNURL Withdraw Request...${Color_Off}"

  local url=${1}
  trace 2 "[call_lnservice_withdraw_request] url=${url}"

  local withdrawRequestResponse=$(exec_in_test_container curl -s ${url})
  trace 2 "[call_lnservice_withdraw_request] withdrawRequestResponse=${withdrawRequestResponse}"

  echo "${withdrawRequestResponse}"
}

create_bolt11() {
  trace 2 "\n\n[create_bolt11] ${BCyan}User creates bolt11 for the payment...${Color_Off}\n"

  local msatoshi=${1}
  trace 3 "[create_bolt11] msatoshi=${msatoshi}"
  local desc=${2}
  trace 3 "[create_bolt11] desc=${desc}"

  local invoice=$(docker exec -it `docker ps -q -f "name=lightning2\."` lightning-cli --lightning-dir=/.lightning invoice ${msatoshi} "${desc}" "${desc}")
  trace 3 "[create_bolt11] invoice=${invoice}"

  echo "${invoice}"
}

get_invoice_status() {
  trace 2 "\n\n[get_invoice_status] ${BCyan}Getting invoice status...${Color_Off}\n"

  local invoice=${1}
  trace 3 "[get_invoice_status] invoice=${invoice}"

  local payment_hash=$(echo "${invoice}" | jq -r ".payment_hash")
  trace 3 "[get_invoice_status] payment_hash=${payment_hash}"
  local data='{"id":1,"jsonrpc":"2.0","method":"listinvoices","params":{"payment_hash":"'${payment_hash}'"}}'
  trace 3 "[get_invoice_status] data=${data}"
  local invoices=$(docker exec -it `docker ps -q -f "name=lightning2\."` lightning-cli --lightning-dir=/.lightning listinvoices -k payment_hash=${payment_hash})
  trace 3 "[get_invoice_status] invoices=${invoices}"
  local status=$(echo "${invoices}" | jq -r ".invoices[0].status")
  trace 3 "[get_invoice_status] status=${status}"

  echo "${status}"
}

call_lnservice_withdraw() {
  trace 1 "\n[call_lnservice_withdraw] ${BCyan}User prepares call to LN Service LNURL Withdraw...${Color_Off}"

  local withdrawRequestResponse=${1}
  trace 2 "[call_lnservice_withdraw] withdrawRequestResponse=${withdrawRequestResponse}"
  local bolt11=${2}
  trace 2 "[call_lnservice_withdraw] bolt11=${bolt11}"

  local callback=$(echo "${withdrawRequestResponse}" | jq -r ".callback")
  trace 2 "[call_lnservice_withdraw] callback=${callback}"
  k1=$(echo "${withdrawRequestResponse}" | jq -r ".k1")
  trace 2 "[call_lnservice_withdraw] k1=${k1}"

  trace 2 "\n[call_lnservice_withdraw] ${BCyan}User finally calls LN Service LNURL Withdraw...${Color_Off}"
  trace 2 "[call_lnservice_withdraw] url=${callback}?k1=${k1}\&pr=${bolt11}"
  withdrawResponse=$(exec_in_test_container curl -s ${callback}?k1=${k1}\&pr=${bolt11})
  trace 2 "[call_lnservice_withdraw] withdrawResponse=${withdrawResponse}"

  echo "${withdrawResponse}"
}

TRACING=3

date

stop_test_container
start_test_container

trace 1 "\n\n[lnurl-withdraw-wallet] ${BCyan}Installing needed packages...${Color_Off}\n"
exec_in_test_container_leave_lf apk add --update curl

lnurl=${1}
trace 2 "[lnurl-withdraw-wallet] lnurl=${lnurl}"
bolt11=${2}
trace 2 "[lnurl-withdraw-wallet] bolt11=${bolt11}"

if [ "${lnurl}" = "createlnurl" ]; then
  # Initializing test variables
  trace 2 "\n\n[lnurl-withdraw-wallet] ${BCyan}Initializing test variables...${Color_Off}\n"
  # callbackservername="lnurl_withdraw_test"
  # callbackserverport="1111"
  # callbackurl="http://${callbackservername}:${callbackserverport}"
  trace 3 "[lnurl-withdraw-wallet] callbackurl=${callbackurl}"

  createLnurlWithdraw=$(create_lnurl_withdraw "${callbackurl}" 600)
  trace 3 "[lnurl-withdraw-wallet] createLnurlWithdraw=${createLnurlWithdraw}"
  lnurl=$(echo "${createLnurlWithdraw}" | jq -r ".result.lnurl")
  trace 3 "[lnurl-withdraw-wallet] lnurl=${lnurl}"
else
  url=$(decode_lnurl "${lnurl}")
  trace 2 "[lnurl-withdraw-wallet] url=${url}"

  withdrawRequestResponse=$(call_lnservice_withdraw_request "${url}")
  trace 2 "[lnurl-withdraw-wallet] withdrawRequestResponse=${withdrawRequestResponse}"

  # {"status":"ERROR","reason":"Expired LNURL-Withdraw"}
  reason=$(echo "${withdrawRequestResponse}" | jq -r ".reason // empty")

  if [ -n "${reason}" ]; then
    trace 1 "\n\n[lnurl-withdraw-wallet] ERROR!  Reason: ${reason}\n\n"
  else
    msatoshi=$(echo "${withdrawRequestResponse}" | jq -r ".maxWithdrawable")
    trace 2 "[lnurl-withdraw-wallet] msatoshi=${msatoshi}"
    desc=$(echo "${withdrawRequestResponse}" | jq -r ".defaultDescription")
    trace 2 "[lnurl-withdraw-wallet] desc=${desc}"

    if [ -z "${bolt11}" ]; then
      invoice=$(create_bolt11 ${msatoshi} "${desc}")
      trace 2 "[lnurl-withdraw-wallet] invoice=${invoice}"
      bolt11=$(echo "${invoice}" | jq -r ".bolt11")

      trace 2 "[lnurl-withdraw-wallet] bolt11=${bolt11}"
    fi

    withdrawResponse=$(call_lnservice_withdraw "${withdrawRequestResponse}" "${bolt11}")
    trace 2 "[lnurl-withdraw-wallet] withdrawResponse=${withdrawResponse}"

    reason=$(echo "${withdrawResponse}" | jq -r ".reason // empty")

    if [ -n "${reason}" ]; then
      trace 1 "\n\n[lnurl-withdraw-wallet] ERROR!  Reason: ${reason}\n\n"
    fi
  fi
fi

trace 1 "\n\n[lnurl-withdraw-wallet] ${BCyan}Tearing down...${Color_Off}\n"

stop_test_container

date

trace 1 "\n\n[lnurl-withdraw-wallet] ${BCyan}See ya!${Color_Off}\n"
