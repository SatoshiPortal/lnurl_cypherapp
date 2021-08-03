#!/bin/sh

. /tests/colors.sh

trace() {
  if [ "${1}" -le "${TRACING}" ]; then
    local str="$(date -Is) $$ ${2}"
    echo -e "${str}" 1>&2
  fi
}

decode_lnurl() {
  trace 1 "\n[decode_lnurl] ${BCyan}Decoding LNURL...${Color_Off}"

  local lnurl=${1}
  trace 2 "[decode_lnurl] lnurl=${lnurl}"

  local data='{"id":0,"method":"decodeBech32","params":{"s":"'${lnurl}'"}}'
  trace 2 "[decode_lnurl] data=${data}"
  local decodedLnurl=$(curl -sd "${data}" -H "Content-Type: application/json" lnurl:8000/api)
  trace 2 "[decode_lnurl] decodedLnurl=${decodedLnurl}"

  echo "${decodedLnurl}"
}

call_lnservice_withdraw_request() {
  trace 1 "\n[call_lnservice_withdraw_request] ${BCyan}User calls LN Service LNURL Withdraw Request...${Color_Off}"

  local url=${1}
  trace 2 "[decode_lnurl] url=${url}"

  local withdrawRequestResponse=$(curl -s ${url})
  trace 2 "[call_lnservice_withdraw_request] withdrawRequestResponse=${withdrawRequestResponse}"

  echo "${withdrawRequestResponse}"
}

create_bolt11() {
  trace 1 "\n[create_bolt11] ${BCyan}User creates bolt11 for the payment...${Color_Off}"

  local amount=${1}
  trace 2 "[create_bolt11] amount=${amount}"
  local label=${2}
  trace 2 "[create_bolt11] label=${label}"
  local desc=${3}
  trace 2 "[create_bolt11] desc=${desc}"

  local data='{"id":1,"jsonrpc": "2.0","method":"invoice","params":{"msatoshi":'${amount}',"label":"'${label}'","description":"'${desc}'"}}'
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

TRACING=2

trace 2 "${Color_Off}"
date

# Install needed packages
trace 2 "\n${BCyan}Installing needed packages...${Color_Off}"
apk add curl jq

lnurl=${1}
trace 2 "lnurl=${lnurl}"

decoded_lnurl=$(decode_lnurl "${lnurl}")
trace 2 "decoded_lnurl=${decoded_lnurl}"
url=$(echo "${decoded_lnurl}" | jq -r ".result")
trace 2 "url=${url}"

withdrawRequestResponse=$(call_lnservice_withdraw_request "${url}")
trace 2 "withdrawRequestResponse=${withdrawRequestResponse}"
amount=$(echo "${withdrawRequestResponse}" | jq -r ".maxWithdrawable")
trace 2 "amount=${amount}"
desc=$(echo "${withdrawRequestResponse}" | jq -r ".defaultDescription")
trace 2 "desc=${desc}"

invoice=$(create_bolt11 ${amount} "$RANDOM" "${desc}")
trace 2 "invoice=${invoice}"
bolt11=$(echo "${invoice}" | jq -r ".bolt11")

withdrawResponse=$(call_lnservice_withdraw "${withdrawRequestResponse}" "${bolt11}")
trace 2 "withdrawResponse=${withdrawResponse}"
