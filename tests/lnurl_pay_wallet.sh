#!/bin/bash

#
# This is a super basic LNURL-pay-compatible wallet, command-line
# Useful to test LNURL on a regtest or testnet environment.
#

#
# This script assumes you have lightning and lightning2 running.
# It will use lightning as the destination wallet (service's wallet)
# It will use lightning2 as the source wallet (user's wallet)
#
# If you don't have a lnurl-pay and want to create one to call pay:
#
# ./lnurl_pay_wallet.sh createlnurl <id>
# ./lnurl_pay_wallet.sh createlnurl "bob"
#
# If you have a lnurl-pay string and want to pay to it from your lightning2 node:
#
# ./lnurl_pay_wallet.sh <lnurl> <msatoshi>
# ./lnurl_pay_wallet.sh LNURL1DP68GURN8GHJ7ARJV9JKV6TT9AKXUATJDSHHQCTE2DCX2CMN9A4K27RTV4UNQVC2VDRYE 30000
#
# If you have a lnurl-pay static address (eg bob@localhost) and want to pay to it:
#
# ./lnurl_pay_wallet.sh paytoaddress <address> <msatoshi>
# ./lnurl_pay_wallet.sh paytoaddress bob@traefik 30100
#

. ./colors.sh

trace() {
  if [ "${1}" -le "${TRACING}" ]; then
    echo -e "$(date -u +%FT%TZ) ${2}" 1>&2
  fi
}

start_test_container() {
  docker run -d --rm -it --name lnurl-pay-wallet --network=cyphernodeappsnet alpine
  docker network connect cyphernodenet lnurl-pay-wallet
}

stop_test_container() {
  trace 1 "\n\n[stop_test_container] ${BCyan}Stopping existing containers if they are running...${Color_Off}\n"

  local containers=$(docker ps -q -f "name=lnurl-pay-wallet")
  if [ -n "${containers}" ]; then
    docker stop $(docker ps -q -f "name=lnurl-pay-wallet")
  fi
}

exec_in_test_container() {
  docker exec -it lnurl-pay-wallet "$@" | tr -d '\r\n'
}

exec_in_test_container_leave_lf() {
  docker exec -it lnurl-pay-wallet "$@"
}

create_lnurl_pay() {
  trace 2 "\n\n[create_lnurl_pay] ${BCyan}Service creates a LNURL Pay Address...${Color_Off}\n"

  local webhookUrl=${1}

  local externalId=${2}

  trace 3 "[create_lnurl_pay] externalId=${externalId}"
  local minMsatoshi=$(($RANDOM-${min_max_range}))
  trace 3 "[create_lnurl_pay] minMsatoshi=${minMsatoshi}"
  local maxMsatoshi=$((${minMsatoshi}+${min_max_range}+${min_max_range}))
  trace 3 "[create_lnurl_pay] maxMsatoshi=${maxMsatoshi}"
  local description="lnurlPayAddressDescription-${externalId}"
  trace 3 "[create_lnurl_pay] description=${description}"

  # Service creates LNURL Pay Address
  data='{"id":0,"method":"createLnurlPay","params":{"externalId":"'${externalId}'","minMsatoshi":'${minMsatoshi}',"maxMsatoshi":'${maxMsatoshi}',"description":"'${description}'","webhookUrl":"'${webhookUrl}'/lnurl/paid-'${externalId}'"}}'
  trace 3 "[create_lnurl_pay] data=${data}"
  trace 3 "[create_lnurl_pay] Calling createLnurlPay..."
  local createLnurlPay=$(exec_in_test_container curl -sd "${data}" -H "Content-Type: application/json" lnurl:8000/api)
  trace 3 "[create_lnurl_pay] createLnurlPay=${createLnurlPay}"

  echo "${createLnurlPay}"
}

get_lnurl_pay() {
  trace 2 "\n\n[get_lnurl_pay] ${BCyan}Get LNURL Pay...${Color_Off}\n"

  local lnurl_pay_id=${1}
  trace 3 "[get_lnurl_pay] lnurl_pay_id=${lnurl_pay_id}"

  # Service creates LNURL Pay
  data='{"id":0,"method":"getLnurlPay","params":{"lnurlPayId":'${lnurl_pay_id}'}}'
  trace 3 "[get_lnurl_pay] data=${data}"
  trace 3 "[get_lnurl_pay] Calling getLnurlPay..."
  local getLnurlPay=$(exec_in_test_container curl -sd "${data}" -H "Content-Type: application/json" lnurl:8000/api)
  trace 3 "[get_lnurl_pay] getLnurlPay=${getLnurlPay}"

  echo "${getLnurlPay}"
}

delete_lnurl_pay() {
  trace 2 "\n\n[delete_lnurl_pay] ${BCyan}Delete LNURL Pay...${Color_Off}\n"

  local lnurl_pay_id=${1}
  trace 3 "[delete_lnurl_pay] lnurl_pay_id=${lnurl_pay_id}"

  # Service deletes LNURL Pay
  data='{"id":0,"method":"deleteLnurlPay","params":{"lnurlPayId":'${lnurl_pay_id}'}}'
  trace 3 "[delete_lnurl_pay] data=${data}"
  trace 3 "[delete_lnurl_pay] Calling deleteLnurlPay..."
  local deleteLnurlPay=$(exec_in_test_container curl -sd "${data}" -H "Content-Type: application/json" lnurl:8000/api)
  trace 3 "[delete_lnurl_pay] deleteLnurlPay=${deleteLnurlPay}"

  local deleted=$(echo "${deleteLnurlPay}" | jq ".result.deleted")
  if [ "${deleted}" = "false" ]; then
    trace 2 "[delete_lnurl_pay] ${On_Red}${BBlack} NOT DELETED!                                                                          ${Color_Off}"
    return 1
  fi

  echo "${deleteLnurlPay}"
}

call_lnservice_pay_specs() {
  trace 1 "\n[call_lnservice_pay_specs] ${BCyan}User calls LN Service LNURL Pay Specs...${Color_Off}"

  local url=${1}
  trace 2 "[call_lnservice_pay_specs] url=${url}"

  local paySpecsResponse=$(exec_in_test_container curl -sk ${url})
  trace 2 "[call_lnservice_pay_specs] paySpecsResponse=${paySpecsResponse}"

  echo "${paySpecsResponse}"
}

call_lnservice_pay_request() {
  trace 1 "\n[call_lnservice_pay_request] ${BCyan}User prepares call to LN Service LNURL Pay Request...${Color_Off}"

  local paySpecsResponse=${1}
  trace 2 "[call_lnservice_pay_request] paySpecsResponse=${paySpecsResponse}"
  local amount=${2}
  trace 2 "[call_lnservice_pay_request] amount=${amount}"

  local callback=$(echo "${paySpecsResponse}" | jq -r ".callback")
  trace 2 "[call_lnservice_pay_request] callback=${callback}"

  trace 2 "\n[call_lnservice_pay_request] ${BCyan}User finally calls LN Service LNURL Pay Request...${Color_Off}"
  trace 2 "[call_lnservice_pay_request] url=${callback}?amount=${amount}"
  payRequestResponse=$(exec_in_test_container curl -sk ${callback}?amount=${amount})
  trace 2 "[call_lnservice_pay_request] payRequestResponse=${payRequestResponse}"

  echo "${payRequestResponse}"
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

decode_bolt11() {
  trace 2 "\n\n[decode_bolt11] ${BCyan}Decoding bolt11 string...${Color_Off}\n"

  local bolt11=${1}

  local data='{"id":1,"jsonrpc":"2.0","method":"decode","params":["'${bolt11}'"]}'
  trace 3 "[decode_bolt11] data=${data}"
  local decoded=$(exec_in_test_container curl -sd "${data}" -H 'X-Access:FoeDdQw5yl7pPfqdlGy3OEk/txGqyJjSbVtffhzs7kc=' -H "Content-Type: application/json" cyphernode_sparkwallet2:9737/rpc)
  trace 3 "[decode_bolt11] decoded=${decoded}"

  echo "${decoded}"
}

check_desc_hash() {
  trace 2 "\n\n[check_desc_hash] ${BCyan}Checking description hash...${Color_Off}\n"

  local bolt11=${1}
  local paySpecsResponse=${2}

  local decoded=$(decode_bolt11 "${bolt11}")
  trace 3 "[check_desc_hash] decoded=${decoded}"
  local description_hash=$(echo "${decoded}" | jq -r ".description_hash")
  trace 3 "[check_desc_hash] description_hash=${description_hash}"

  local metadata=$(echo "${paySpecsResponse}" | jq -r ".metadata")
  trace 3 "[happy_path] metadata=${metadata}"
  local computed_hash=$(echo -n ${metadata} | shasum -a 256 | cut -d' ' -f1)
  trace 3 "[check_desc_hash] computed_hash=${computed_hash}"

  if [ "${computed_hash}" = "${description_hash}" ]; then
    trace 1 "\n\n[check_desc_hash] ${On_IGreen}${BBlack}  check_desc_hash: description hash is good!                                                                       ${Color_Off}\n"
    date
    return 0
  else
    trace 1 "\n\n[check_desc_hash] ${On_Red}${BBlack}  check_desc_hash: description hash not good!  FAILURE!                                                                         ${Color_Off}\n"
    date
    return 1
  fi
}

pay_with_ln1() {
  local lnPay=$(ln_pay "${1}")
  trace 3 "[pay_with_ln1] lnPay=${lnPay}"

  echo "${lnPay}"
}

pay_with_ln2() {
  local lnPay=$(ln_pay "${1}" 2)
  trace 3 "[pay_with_ln2] lnPay=${lnPay}"

  echo "${lnPay}"
}

ln_pay() {
  trace 2 "\n\n[ln_pay] ${BCyan}Paying an invoice...${Color_Off}\n"

  local bolt11=${1}
  trace 3 "[ln_pay] payment_hash=${payment_hash}"
  local instance=${2}
  trace 3 "[ln_pay] instance=${instance}"

  local data='{"id":1,"jsonrpc":"2.0","method":"pay","params":["'${bolt11}'"]}'
  trace 3 "[ln_pay] data=${data}"
  local lnpay=$(exec_in_test_container curl -sd "${data}" -H 'X-Access:FoeDdQw5yl7pPfqdlGy3OEk/txGqyJjSbVtffhzs7kc=' -H "Content-Type: application/json" cyphernode_sparkwallet${instance}:9737/rpc)
  trace 3 "[ln_pay] lnpay=${lnpay}"

  echo "${lnpay}"
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

pay_to() {
  local url=${1}
  local msatoshi=${2}

  local paySpecsResponse=$(call_lnservice_pay_specs "${url}")
  trace 2 "[pay_to] paySpecsResponse=${paySpecsResponse}"

  # {"status":"ERROR","reason":"Expired LNURL-Pay"}
  local reason=$(echo "${paySpecsResponse}" | jq -r ".reason // empty")

  if [ -n "${reason}" ]; then
    trace 1 "\n\n[pay_to] ERROR!  Reason: ${reason}\n\n"
  else
    local payResponse=$(call_lnservice_pay_request "${paySpecsResponse}" "${msatoshi}")
    trace 2 "[pay_to] payResponse=${payResponse}"

    reason=$(echo "${payResponse}" | jq -r ".reason // empty")

    if [ -n "${reason}" ]; then
      trace 1 "\n\n[pay_to] ERROR!  Reason: ${reason}\n\n"
    else
      local bolt11=$(echo "${payResponse}" | jq -r ".pr")
      trace 2 "[pay_to] bolt11=${bolt11}"

      check_desc_hash "${bolt11}" "${paySpecsResponse}"
      if [ "$?" = "1" ]; then
        trace 1 "\n\n[pay_to] ERROR!  Reason: description_hash doesn't match metadata!\n\n"
        return 1
      fi

      local lnPay=$(pay_with_ln2 "${bolt11}")
      trace 2 "[pay_to] lnPay=${lnPay}"
    fi
  fi
}

TRACING=3

date

stop_test_container
start_test_container

trace 1 "\n\n[lnurl-pay-wallet] ${BCyan}Installing needed packages...${Color_Off}\n"
exec_in_test_container_leave_lf apk add --update curl

lnurl=${1}
trace 2 "[lnurl-pay-wallet] lnurl=${lnurl}"

if [ "${lnurl}" = "createlnurl" ]; then
  trace 2 "\n\n[lnurl-pay-wallet] ${BCyan} createlnurl...${Color_Off}\n"

  min_max_range=1000

  address=${2}
  trace 2 "[lnurl-pay-wallet] address=${address}"

  # Initializing test variables
  trace 2 "\n\n[lnurl-pay-wallet] ${BCyan}Initializing test variables...${Color_Off}\n"

  trace 3 "[lnurl-pay-wallet] callbackurl=${callbackurl}"

  createLnurlPay=$(create_lnurl_pay "${callbackurl}" "${address}")
  trace 3 "[lnurl-pay-wallet] createLnurlPay=${createLnurlPay}"
  lnurl=$(echo "${createLnurlPay}" | jq -r ".result.lnurl")
  trace 3 "[lnurl-pay-wallet] lnurl=${lnurl}"
elif [ "${lnurl}" = "paytoaddress" ]; then
  trace 2 "\n\n[lnurl-pay-wallet] ${BCyan} paytoaddress...${Color_Off}\n"

  # kexkey03@traefik
  address=${2}
  trace 2 "[lnurl-pay-wallet] address=${address}"
  user=$(echo "${address}" | cut -d'@' -f1)
  trace 2 "[lnurl-pay-wallet] user=${user}"
  domain=$(echo "${address}" | cut -d'@' -f2)
  trace 2 "[lnurl-pay-wallet] domain=${domain}"

  msatoshi=${3}
  trace 2 "[lnurl-pay-wallet] msatoshi=${msatoshi}"

  url="https://${domain}/lnurl/.well-known/lnurlp/${user}"

  pay_to "${url}" ${msatoshi}

else
  url=$(decode_lnurl "${lnurl}")
  trace 2 "[lnurl-pay-wallet] url=${url}"

  msatoshi=${2}
  trace 2 "[lnurl-pay-wallet] msatoshi=${msatoshi}"

  pay_to "${url}" ${msatoshi}

fi

trace 1 "\n\n[lnurl-pay-wallet] ${BCyan}Tearing down...${Color_Off}\n"

stop_test_container

date

trace 1 "\n\n[lnurl-pay-wallet] ${BCyan}See ya!${Color_Off}\n"
