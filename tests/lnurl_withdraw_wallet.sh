#!/bin/sh

. /tests/colors.sh

trace() {
  if [ "${1}" -le "${TRACING}" ]; then
    local str="$(date -Is) $$ ${2}"
    echo -e "${str}" 1>&2
  fi
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
  local expiration=$(date -d @$(($(date -u +"%s")+${expiration_offset})) +"%Y-%m-%dT%H:%M:%SZ")
  trace 3 "[create_lnurl_withdraw] expiration=${expiration}"
  local fallback_addr=${4:-""}
  local fallback_batched=${5:-"false"}

  if [ -n "${callbackurl}" ]; then
    callbackurl=',"webhookUrl":"'${callbackurl}'/lnurl/inv'${invoicenumber}'"'
  fi

  # Service creates LNURL Withdraw
  data='{"id":0,"method":"createLnurlWithdraw","params":{"msatoshi":'${msatoshi}',"description":"desc'${invoicenumber}'","expiresAt":"'${expiration}'"'${callbackurl}',"btcFallbackAddress":"'${fallback_addr}'","batchFallback":'${fallback_batched}'}}'
  trace 3 "[create_lnurl_withdraw] data=${data}"
  trace 3 "[create_lnurl_withdraw] Calling createLnurlWithdraw..."
  local createLnurlWithdraw=$(curl -sd "${data}" -H "Content-Type: application/json" lnurl:8000/api)
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
  local decodedLnurl=$(curl -sd "${data}" -H "Content-Type: application/json" lnurl:8000/api)
  trace 3 "[decode_lnurl] decodedLnurl=${decodedLnurl}"
  local url=$(echo "${decodedLnurl}" | jq -r ".result")
  trace 3 "[decode_lnurl] url=${url}"

  echo "${url}"
}

call_lnservice_withdraw_request() {
  trace 1 "\n[call_lnservice_withdraw_request] ${BCyan}User calls LN Service LNURL Withdraw Request...${Color_Off}"

  local url=${1}
  trace 2 "[call_lnservice_withdraw_request] url=${url}"

  local withdrawRequestResponse=$(curl -s ${url})
  trace 2 "[call_lnservice_withdraw_request] withdrawRequestResponse=${withdrawRequestResponse}"

  echo "${withdrawRequestResponse}"
}

create_bolt11() {
  trace 1 "\n[create_bolt11] ${BCyan}User creates bolt11 for the payment...${Color_Off}"

  local msatoshi=${1}
  trace 2 "[create_bolt11] msatoshi=${msatoshi}"
  local label=${2}
  trace 2 "[create_bolt11] label=${label}"
  local desc=${3}
  trace 2 "[create_bolt11] desc=${desc}"

  local data='{"id":1,"jsonrpc": "2.0","method":"invoice","params":{"msatoshi":'${msatoshi}',"label":"'${label}'","description":"'${desc}'"}}'
  trace 2 "[create_bolt11] data=${data}"
  local invoice=$(curl -sd "${data}" -H 'X-Access:FoeDdQw5yl7pPfqdlGy3OEk/txGqyJjSbVtffhzs7kc=' -H "Content-Type: application/json" cyphernode_sparkwallet2:9737/rpc)
  trace 2 "[create_bolt11] invoice=${invoice}"

  echo "${invoice}"
}

get_invoice_status() {
  trace 1 "\n[get_invoice_status] ${BCyan}Let's make sure the invoice is unpaid first...${Color_Off}"

  local invoice=${1}
  trace 2 "[get_invoice_status] invoice=${invoice}"

  local payment_hash=$(echo "${invoice}" | jq -r ".payment_hash")
  trace 2 "[get_invoice_status] payment_hash=${payment_hash}"
  local data='{"id":1,"jsonrpc": "2.0","method":"listinvoices","params":{"payment_hash":"'${payment_hash}'"}}'
  trace 2 "[get_invoice_status] data=${data}"
  local invoices=$(curl -sd "${data}" -H 'X-Access:FoeDdQw5yl7pPfqdlGy3OEk/txGqyJjSbVtffhzs7kc=' -H "Content-Type: application/json" cyphernode_sparkwallet2:9737/rpc)
  trace 2 "[get_invoice_status] invoices=${invoices}"
  local status=$(echo "${invoices}" | jq -r ".invoices[0].status")
  trace 2 "[get_invoice_status] status=${status}"

  echo "${status}"
}

call_lnservice_withdraw() {
  trace 1 "\n[call_lnservice_withdraw] ${BCyan}User prepares call to LN Service LNURL Withdraw...${Color_Off}"

  local withdrawRequestResponse=${1}
  trace 2 "[call_lnservice_withdraw] withdrawRequestResponse=${withdrawRequestResponse}"
  local bolt11=${2}
  trace 2 "[call_lnservice_withdraw] bolt11=${bolt11}"

  callback=$(echo "${withdrawRequestResponse}" | jq -r ".callback")
  trace 2 "[call_lnservice_withdraw] callback=${callback}"
  k1=$(echo "${withdrawRequestResponse}" | jq -r ".k1")
  trace 2 "[call_lnservice_withdraw] k1=${k1}"

  trace 2 "\n[call_lnservice_withdraw] ${BCyan}User finally calls LN Service LNURL Withdraw...${Color_Off}"
  trace 2 "url=${callback}?k1=${k1}\&pr=${bolt11}"
  withdrawResponse=$(curl -s ${callback}?k1=${k1}\&pr=${bolt11})
  trace 2 "[call_lnservice_withdraw] withdrawResponse=${withdrawResponse}"

  echo "${withdrawResponse}"
}

TRACING=3

trace 2 "${Color_Off}"
date

# Install needed packages
trace 2 "\n${BCyan}Installing needed packages...${Color_Off}"
apk add curl jq

lnurl=${1}
trace 2 "lnurl=${lnurl}"
bolt11=${2}
trace 2 "bolt11=${bolt11}"

if [ "${lnurl}" = "createlnurl" ]; then
  # Initializing test variables
  trace 2 "\n\n${BCyan}Initializing test variables...${Color_Off}\n"
  # callbackservername="lnurl_withdraw_test"
  # callbackserverport="1111"
  # callbackurl="http://${callbackservername}:${callbackserverport}"
  trace 3 "callbackurl=${callbackurl}"

  createLnurlWithdraw=$(create_lnurl_withdraw "${callbackurl}" 600)
  trace 3 "[fallback3] createLnurlWithdraw=${createLnurlWithdraw}"
  lnurl=$(echo "${createLnurlWithdraw}" | jq -r ".result.lnurl")
  trace 3 "[fallback3] lnurl=${lnurl}"
else
  url=$(decode_lnurl "${lnurl}")
  trace 2 "url=${url}"

  withdrawRequestResponse=$(call_lnservice_withdraw_request "${url}")
  trace 2 "withdrawRequestResponse=${withdrawRequestResponse}"

  # {"status":"ERROR","reason":"Expired LNURL-Withdraw"}
  reason=$(echo "${withdrawRequestResponse}" | jq -r ".reason // empty")

  if [ -n "${reason}" ]; then
    trace 1 "\n\nERROR!  Reason: ${reason}\n\n"
    return 1
  fi

  msatoshi=$(echo "${withdrawRequestResponse}" | jq -r ".maxWithdrawable")
  trace 2 "msatoshi=${msatoshi}"
  desc=$(echo "${withdrawRequestResponse}" | jq -r ".defaultDescription")
  trace 2 "desc=${desc}"

  if [ -z "${bolt11}" ]; then
    invoice=$(create_bolt11 ${msatoshi} "$RANDOM" "${desc}")
    trace 2 "invoice=${invoice}"
    bolt11=$(echo "${invoice}" | jq -r ".bolt11")

    trace 2 "bolt11=${bolt11}"
  fi

  withdrawResponse=$(call_lnservice_withdraw "${withdrawRequestResponse}" "${bolt11}")
  trace 2 "withdrawResponse=${withdrawResponse}"

  reason=$(echo "${withdrawResponse}" | jq -r ".reason // empty")

  if [ -n "${reason}" ]; then
    trace 1 "\n\nERROR!  Reason: ${reason}\n\n"
    return 1
  fi
fi
