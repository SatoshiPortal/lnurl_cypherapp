#!/bin/bash

# This needs to be run in regtest
# You need jq installed for these tests to run correctly

# Happy path

# 1. Service creates a LNURL Pay Address
# 2. Get it and compare
# 3. User calls LNServicePay
# 4. User calls LNServicePayRequest
# 5. User pays the received invoice
# 6. Cyphernode ln_pay's callback occurs

# Invalid LNURL Pay Address Creation

# 1. Service creates a LNURL Pay Address with invalid min/max
# 2. Service creates a LNURL Pay Address without description

# Invalid payment to LNURL Pay Address

# 1. Service creates a LNURL Pay Address
# 2. Get it and compare
# 3. User calls LNServicePay
# 4. User calls LNServicePayRequest with an amount less than min
# 5. User calls LNServicePayRequest with an amount more than max

# Pay to a deleted LNURL Pay Address

# 1. Service creates a LNURL Pay Address
# 2. Get it and compare
# 4. User calls LNServicePay
# 5. User calls LNServicePayRequest
# 6. User pays the received invoice
# 7. Cyphernode ln_pay's callback occurs
# 8. Service deletes the LNURL Pay Address
# 9. User calls LNServicePay
# 10. User calls LNServicePayRequest



. ./colors.sh
. ./mine.sh
. ./ln_reconnect.sh

trace() {
  if [ "${1}" -le "${TRACING}" ]; then
    echo -e "$(date -u +%FT%TZ) ${2}" 1>&2
  fi
}

start_test_container() {
  docker run -d --rm -it --name tests-lnurl-pay --network=cyphernodeappsnet alpine
  docker network connect cyphernodenet tests-lnurl-pay
}

stop_test_container() {
  trace 1 "\n\n[stop_test_container] ${BCyan}Stopping existing containers if they are running...${Color_Off}\n"

  local containers=$(docker ps -q -f "name=tests-lnurl-pay")
  if [ -n "${containers}" ]; then
    docker stop $(docker ps -q -f "name=tests-lnurl-pay")
  fi
}

exec_in_test_container() {
  docker exec -it tests-lnurl-pay "$@" | tr -d '\r\n'
}

exec_in_test_container_leave_lf() {
  docker exec -it tests-lnurl-pay "$@"
}


create_lnurl_pay() {
  trace 2 "\n\n[create_lnurl_pay] ${BCyan}Service creates a LNURL Pay Address...${Color_Off}\n"

  local webhookUrl=${1}
  local externalIdNumber=${2:-$(($RANDOM+${min_max_range}))}
  trace 3 "[create_lnurl_pay] externalIdNumber=${externalIdNumber}"
  local externalId="lnurlPayAddress-${externalIdNumber}"
  trace 3 "[create_lnurl_pay] externalId=${externalId}"
  local minMsatoshi=${3:-$((${externalIdNumber}-${min_max_range}))}
  trace 3 "[create_lnurl_pay] minMsatoshi=${minMsatoshi}"
  local maxMsatoshi=$((${externalIdNumber}+${min_max_range}))
  trace 3 "[create_lnurl_pay] maxMsatoshi=${maxMsatoshi}"
  local description="lnurlPayAddressDescription-${externalIdNumber}"
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

call_lnservice_pay_request() {
  trace 1 "\n[call_lnservice_pay_request] ${BCyan}User calls LN Service LNURL Pay Request...${Color_Off}"

  local url=${1}
  trace 2 "[call_lnservice_pay_request] url=${url}"

  local payRequestResponse=$(exec_in_test_container curl -sk ${url})
  trace 2 "[call_lnservice_pay_request] payRequestResponse=${payRequestResponse}"

  echo "${payRequestResponse}"
}

call_lnservice_pay() {
  trace 1 "\n[call_lnservice_pay] ${BCyan}User prepares call to LN Service LNURL Pay...${Color_Off}"

  local payRequestResponse=${1}
  trace 2 "[call_lnservice_pay] payRequestResponse=${payRequestResponse}"
  local amount=${2}
  trace 2 "[call_lnservice_pay] amount=${amount}"

  local callback=$(echo "${payRequestResponse}" | jq -r ".callback")
  trace 2 "[call_lnservice_pay] callback=${callback}"
  # k1=$(echo "${payRequestResponse}" | jq -r ".k1")
  # trace 2 "[call_lnservice_pay] k1=${k1}"

  trace 2 "\n[call_lnservice_pay] ${BCyan}User finally calls LN Service LNURL Pay...${Color_Off}"
  trace 2 "[call_lnservice_pay] url=${callback}?amount=${amount}"
  payResponse=$(exec_in_test_container curl -sk ${callback}?amount=${amount})
  trace 2 "[call_lnservice_pay] payResponse=${payResponse}"

  echo "${payResponse}"
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

create_bolt11() {
  trace 2 "\n\n[create_bolt11] ${BCyan}User creates bolt11 for the payment...${Color_Off}\n"

  local msatoshi=${1}
  trace 3 "[create_bolt11] msatoshi=${msatoshi}"
  local desc=${2}
  trace 3 "[create_bolt11] desc=${desc}"

  local invoice=$(docker exec -it `docker ps -q -f "name=lightning2\."` lightning-cli invoice ${msatoshi} "${desc}" "${desc}")
  trace 3 "[create_bolt11] invoice=${invoice}"

  echo "${invoice}"
}

get_invoice_status_ln1() {
  local status=$(get_invoice_status "${1}")
  trace 3 "[get_invoice_status_ln1] status=${status}"

  echo "${status}"
}

get_invoice_status_ln2() {
  local status=$(get_invoice_status "${1}" 2)
  trace 3 "[get_invoice_status_ln2] status=${status}"

  echo "${status}"
}

get_invoice_status() {
  trace 2 "\n\n[get_invoice_status] ${BCyan}Getting invoice status...${Color_Off}\n"

  local payment_hash=${1}
  trace 3 "[get_invoice_status] payment_hash=${payment_hash}"
  local instance=${2}
  trace 3 "[get_invoice_status] instance=${instance}"

  # local payment_hash=$(echo "${invoice}" | jq -r ".payment_hash")
  # trace 3 "[get_invoice_status] payment_hash=${payment_hash}"
  local data='{"id":1,"jsonrpc":"2.0","method":"listinvoices","params":{"payment_hash":"'${payment_hash}'"}}'
  trace 3 "[get_invoice_status] data=${data}"
  local invoices=$(docker exec -it `docker ps -q -f "name=lightning${instance}\."` lightning-cli listinvoices -k payment_hash=${payment_hash})
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
  withdrawResponse=$(exec_in_test_container curl -sk ${callback}?k1=${k1}\&pr=${bolt11})
  trace 2 "[call_lnservice_withdraw] withdrawResponse=${withdrawResponse}"

  echo "${withdrawResponse}"
}

happy_path() {
  # Happy path

  # 1. Service creates a LNURL Pay Address
  # 2. Get it and compare
  # 3. User calls LNServicePay
  # 4. User calls LNServicePayRequest
  # 5. User pays the received invoice
  # 6. Cyphernode ln_pay's callback occurs

  trace 1 "\n\n[happy_path] ${On_Yellow}${BBlack} Happy path:                                                                     ${Color_Off}\n"

  local callbackurl=${1}

  # 1. Service creates a LNURL Pay Address

  local externalIdRandom=$(($RANDOM+${min_max_range}))
  trace 3 "[happy_path] externalIdRandom=${externalIdRandom}"
  local createLnurlPay=$(create_lnurl_pay "${callbackurl}" ${externalIdRandom})
  trace 3 "[happy_path] createLnurlPay=${createLnurlPay}"
  local lnurl_pay_id=$(echo "${createLnurlPay}" | jq -r ".result.lnurlPayId")

  # 2. Get it and compare

  local get_lnurl_pay=$(get_lnurl_pay ${lnurl_pay_id})
  trace 3 "[happy_path] get_lnurl_pay=${get_lnurl_pay}"
  local equals=$(jq --argjson a "${createLnurlPay}" --argjson b "${get_lnurl_pay}" -n '$a == $b')
  trace 3 "[happy_path] equals=${equals}"
  if [ "${equals}" = "true" ]; then
    trace 2 "[happy_path] EQUALS!"
  else
    trace 1 "\n[happy_path] ${On_Red}${BBlack}  Happy path: NOT EQUALS!                                                                          ${Color_Off}\n"
    return 1
  fi

  local lnurl=$(echo "${get_lnurl_pay}" | jq -r ".result.lnurl")
  trace 3 "[happy_path] lnurl=${lnurl}"

  # Decode LNURL
  local serviceUrl=$(decode_lnurl "${lnurl}")
  trace 3 "[happy_path] serviceUrl=${serviceUrl}"

  # 3. User calls LNServicePay

  local payRequestResponse=$(call_lnservice_pay_request "${serviceUrl}")
  trace 3 "[happy_path] payRequestResponse=${payRequestResponse}"

  # 4. User calls LNServicePayRequest

  local payResponse=$(call_lnservice_pay "${payRequestResponse}" ${externalIdRandom})
  trace 3 "[happy_path] payResponse=${payResponse}"
  local bolt11=$(echo ${payResponse} | jq -r ".pr")
  trace 3 "[happy_path] bolt11=${bolt11}"

  # Reconnecting the two LN instances...
  ln_reconnect

  start_callback_server

  trace 2 "\n\n[happy_path] ${BPurple}Waiting for the LNURL payment callback...\n${Color_Off}"

  # 5. User pays the received invoice

  local data='{"id":1,"jsonrpc":"2.0","method":"pay","params":["'${bolt11}'"]}'
  trace 3 "[happy_path] data=${data}"
  local lnpay=$(exec_in_test_container curl -sd "${data}" -H 'X-Access:FoeDdQw5yl7pPfqdlGy3OEk/txGqyJjSbVtffhzs7kc=' -H "Content-Type: application/json" cyphernode_sparkwallet2:9737/rpc)
  trace 3 "[happy_path] lnpay=${lnpay}"

  # 6. Cyphernode ln_pay's callback occurs

  wait

  local payment_hash=$(echo ${lnpay} | jq -r ".payment_hash")
  trace 3 "[happy_path] payment_hash=${payment_hash}"

  # We want to see if payment received (invoice status paid)
  status=$(get_invoice_status_ln1 "${payment_hash}")
  trace 3 "[happy_path] status=${status}"

  if [ "${status}" = "paid" ]; then
    trace 1 "\n\n[happy_path] ${On_IGreen}${BBlack}  Happy path: SUCCESS!                                                                       ${Color_Off}\n"
    date
    return 0
  else
    trace 1 "\n\n[happy_path] ${On_Red}${BBlack}  Happy path: FAILURE!                                                                         ${Color_Off}\n"
    date
    return 1
  fi
}


invalid_creation() {
  # Invalid LNURL Pay Address Creation

  # 1. Service creates a LNURL Pay Address with invalid min amount
  # 2. Service creates a LNURL Pay Address without description

  trace 1 "\n\n[invalid_creation] ${On_Yellow}${BBlack} Invalid LNURL Pay Address creation:                                                          ${Color_Off}\n"

  local callbackurl=${1}

  # 1. Service creates a LNURL Pay Address

  local externalIdRandom=$(($RANDOM+${min_max_range}))
  trace 3 "[invalid_creation] externalIdRandom=${externalIdRandom}"
  # the min amount of 0 should make the creation fail
  local createLnurlPay=$(create_lnurl_pay "${callbackurl}" ${externalIdRandom} 0)
  trace 3 "[invalid_creation] createLnurlPay=${createLnurlPay}"

  echo "${createLnurlPay}" | grep -qi "error"
  if [ "$?" -eq "0" ]; then
    trace 1 "\n\n[invalid_creation] ${On_IGreen}${BBlack} invalid_creation: minAmount 0 failed, good!                                                                ${Color_Off}\n"
  else
    trace 1 "\n\n[invalid_creation] ${On_Red}${BBlack} invalid_creation: minAmount 0 should have failed!                                                            ${Color_Off}\n"
    return 1
  fi

  createLnurlPay=$(create_lnurl_pay "${callbackurl}" ${externalIdRandom} -1)
  trace 3 "[invalid_creation] createLnurlPay=${createLnurlPay}"

  echo "${createLnurlPay}" | grep -qi "error"
  if [ "$?" -eq "0" ]; then
    trace 1 "\n\n[invalid_creation] ${On_IGreen}${BBlack} invalid_creation: minAmount -1 failed, good!                                                                ${Color_Off}\n"
  else
    trace 1 "\n\n[invalid_creation] ${On_Red}${BBlack} invalid_creation: minAmount -1 should have failed!                                                            ${Color_Off}\n"
    return 1
  fi

  local toolarge=$((${externalIdRandom}+${min_max_range}+1))
  trace 3 "[invalid_creation] toolarge=${toolarge}"

  createLnurlPay=$(create_lnurl_pay "${callbackurl}" ${externalIdRandom} ${toolarge})
  trace 3 "[invalid_creation] createLnurlPay=${createLnurlPay}"

  echo "${createLnurlPay}" | grep -qi "error"
  if [ "$?" -eq "0" ]; then
    trace 1 "\n\n[invalid_creation] ${On_IGreen}${BBlack} invalid_creation: minAmount larger than maxAmount failed, good!                                                                ${Color_Off}\n"
  else
    trace 1 "\n\n[invalid_creation] ${On_Red}${BBlack} invalid_creation: minAmount larger than maxAmount should have failed!                                                            ${Color_Off}\n"
    return 1
  fi

  local maxAmount=$((${externalIdRandom}+${min_max_range}))
  trace 3 "[invalid_creation] maxAmount=${maxAmount}"

  createLnurlPay=$(create_lnurl_pay "${callbackurl}" ${externalIdRandom} ${maxAmount})
  trace 3 "[invalid_creation] createLnurlPay=${createLnurlPay}"

  echo "${createLnurlPay}" | grep -qi "error"
  if [ "$?" -eq "1" ]; then
    trace 1 "\n\n[invalid_creation] ${On_IGreen}${BBlack} invalid_creation: minAmount equals maxAmount worked, good!                                                                ${Color_Off}\n"
  else
    trace 1 "\n\n[invalid_creation] ${On_Red}${BBlack} invalid_creation: minAmount equals maxAmount should have worked! NOT good!                                                           ${Color_Off}\n"
    return 1
  fi
}


invalid_payment() {
  # Invalid payment to LNURL Pay Address

  # 1. Service creates a LNURL Pay Address
  # 2. Get it and compare
  # 3. User calls LNServicePay
  # 4. User calls LNServicePayRequest with an amount less than min
  # 5. User calls LNServicePayRequest with an amount more than max

  trace 1 "\n\n[invalid_payment] ${On_Yellow}${BBlack} Invalid payment:                                                                     ${Color_Off}\n"

  local callbackurl=${1}

  # 1. Service creates a LNURL Pay Address

  local externalIdRandom=$(($RANDOM+${min_max_range}))
  trace 3 "[invalid_payment] externalIdRandom=${externalIdRandom}"
  local createLnurlPay=$(create_lnurl_pay "${callbackurl}" ${externalIdRandom})
  trace 3 "[invalid_payment] createLnurlPay=${createLnurlPay}"
  local lnurl_pay_id=$(echo "${createLnurlPay}" | jq -r ".result.lnurlPayId")

  # 2. Get it and compare

  local get_lnurl_pay=$(get_lnurl_pay ${lnurl_pay_id})
  trace 3 "[invalid_payment] get_lnurl_pay=${get_lnurl_pay}"
  local equals=$(jq --argjson a "${createLnurlPay}" --argjson b "${get_lnurl_pay}" -n '$a == $b')
  trace 3 "[invalid_payment] equals=${equals}"
  if [ "${equals}" = "true" ]; then
    trace 2 "[invalid_payment] EQUALS!"
  else
    trace 1 "\n[invalid_payment] ${On_Red}${BBlack}  Invalid Payment: NOT EQUALS!                                                                          ${Color_Off}\n"
    return 1
  fi

  local lnurl=$(echo "${get_lnurl_pay}" | jq -r ".result.lnurl")
  trace 3 "[invalid_payment] lnurl=${lnurl}"

  # Decode LNURL
  local serviceUrl=$(decode_lnurl "${lnurl}")
  trace 3 "[invalid_payment] serviceUrl=${serviceUrl}"

  # 3. User calls LNServicePay

  local payRequestResponse=$(call_lnservice_pay_request "${serviceUrl}")
  trace 3 "[invalid_payment] payRequestResponse=${payRequestResponse}"

  # 4. User calls LNServicePayRequest with an amount less than min

  local toosmall=$((${externalIdRandom}-${min_max_range}-1))
  trace 3 "[invalid_payment] toosmall=${toosmall}"

  local payResponse=$(call_lnservice_pay "${payRequestResponse}" ${toosmall})
  trace 3 "[invalid_payment] payResponse=${payResponse}"

  echo "${payResponse}" | grep -qi "error"
  if [ "$?" -eq "0" ]; then
    trace 1 "\n\n[invalid_payment] ${On_IGreen}${BBlack} invalid_payment: amount smaller than minAmount failed, good!                                                                ${Color_Off}\n"
  else
    trace 1 "\n\n[invalid_payment] ${On_Red}${BBlack} invalid_payment: amount smaller than minAmount should have failed!                                                            ${Color_Off}\n"
    return 1
  fi

  sleep 1

  # 5. User calls LNServicePayRequest with an amount more than max

  local toolarge=$((${externalIdRandom}+${min_max_range}+1))
  trace 3 "[invalid_payment] toolarge=${toolarge}"

  local payResponse=$(call_lnservice_pay "${payRequestResponse}" ${toolarge})
  trace 3 "[invalid_payment] payResponse=${payResponse}"

  echo "${payResponse}" | grep -qi "error"
  if [ "$?" -eq "0" ]; then
    trace 1 "\n\n[invalid_payment] ${On_IGreen}${BBlack} invalid_payment: amount larger than maxAmount failed, good!                                                                ${Color_Off}\n"
  else
    trace 1 "\n\n[invalid_payment] ${On_Red}${BBlack} invalid_payment: amount larger than maxAmount should have failed!                                                            ${Color_Off}\n"
    return 1
  fi
}

pay_to_deleted() {
  # Pay to a deleted LNURL Pay Address

  # 1. Service creates a LNURL Pay Address
  # 2. Get it and compare
  # 4. User calls LNServicePay
  # 5. User calls LNServicePayRequest
  # 6. User pays the received invoice
  # 7. Cyphernode ln_pay's callback occurs
  # 8. Service deletes the LNURL Pay Address
  # 9. User calls LNServicePay
  # 10. User calls LNServicePayRequest

  trace 1 "\n\n[pay_to_deleted] ${On_Yellow}${BBlack} Pay to deleted LNURL Pay Address:                                                                     ${Color_Off}\n"

  local callbackurl=${1}

  # 1. Service creates a LNURL Pay Address

  local externalIdRandom=$(($RANDOM+${min_max_range}))
  trace 3 "[pay_to_deleted] externalIdRandom=${externalIdRandom}"
  local createLnurlPay=$(create_lnurl_pay "${callbackurl}" ${externalIdRandom})
  trace 3 "[pay_to_deleted] createLnurlPay=${createLnurlPay}"
  local lnurl_pay_id=$(echo "${createLnurlPay}" | jq -r ".result.lnurlPayId")

  # 2. Get it and compare

  local get_lnurl_pay=$(get_lnurl_pay ${lnurl_pay_id})
  trace 3 "[pay_to_deleted] get_lnurl_pay=${get_lnurl_pay}"
  local equals=$(jq --argjson a "${createLnurlPay}" --argjson b "${get_lnurl_pay}" -n '$a == $b')
  trace 3 "[pay_to_deleted] equals=${equals}"
  if [ "${equals}" = "true" ]; then
    trace 2 "[pay_to_deleted] EQUALS!"
  else
    trace 1 "\n[pay_to_deleted] ${On_Red}${BBlack}  Pay to deleted: NOT EQUALS!                                                                          ${Color_Off}\n"
    return 1
  fi

  local lnurl=$(echo "${get_lnurl_pay}" | jq -r ".result.lnurl")
  trace 3 "[pay_to_deleted] lnurl=${lnurl}"

  # Decode LNURL
  local serviceUrl=$(decode_lnurl "${lnurl}")
  trace 3 "[pay_to_deleted] serviceUrl=${serviceUrl}"

  # 3. User calls LNServicePay

  local payRequestResponse=$(call_lnservice_pay_request "${serviceUrl}")
  trace 3 "[pay_to_deleted] payRequestResponse=${payRequestResponse}"

  sleep 1

  # 4. User calls LNServicePayRequest

  local payResponse=$(call_lnservice_pay "${payRequestResponse}" ${externalIdRandom})
  trace 3 "[pay_to_deleted] payResponse=${payResponse}"
  local bolt11=$(echo ${payResponse} | jq -r ".pr")
  trace 3 "[pay_to_deleted] bolt11=${bolt11}"

  # Reconnecting the two LN instances...
  ln_reconnect

  start_callback_server

  trace 2 "\n\n[pay_to_deleted] ${BPurple}Waiting for the LNURL payment callback...\n${Color_Off}"

  # 5. User pays the received invoice

  local data='{"id":1,"jsonrpc":"2.0","method":"pay","params":["'${bolt11}'"]}'
  trace 3 "[pay_to_deleted] data=${data}"
  local lnpay=$(exec_in_test_container curl -sd "${data}" -H 'X-Access:FoeDdQw5yl7pPfqdlGy3OEk/txGqyJjSbVtffhzs7kc=' -H "Content-Type: application/json" cyphernode_sparkwallet2:9737/rpc)
  trace 3 "[pay_to_deleted] lnpay=${lnpay}"

  # 6. Cyphernode ln_pay's callback occurs

  wait

  local payment_hash=$(echo ${lnpay} | jq -r ".payment_hash")
  trace 3 "[pay_to_deleted] payment_hash=${payment_hash}"

  # We want to see if payment received (invoice status paid)
  status=$(get_invoice_status_ln1 "${payment_hash}")
  trace 3 "[pay_to_deleted] status=${status}"

  if [ "${status}" = "paid" ]; then
    trace 1 "\n\n[pay_to_deleted] ${On_IGreen}${BBlack}  Pay to deleted: SUCCESS!                                                                       ${Color_Off}\n"
  else
    trace 1 "\n\n[pay_to_deleted] ${On_Red}${BBlack}  Pay to deleted: FAILURE!                                                                         ${Color_Off}\n"
    date
    return 1
  fi

  # 8. Service deletes the LNURL Pay Address
  local delete_lnurl_pay=$(delete_lnurl_pay ${lnurl_pay_id})
  trace 3 "[pay_to_deleted] delete_lnurl_pay=${delete_lnurl_pay}"
  local deleted=$(echo "${get_lnurl_pay}" | jq '.result.deleted = true | del(.result.updatedAt)')
  trace 3 "[pay_to_deleted] deleted=${deleted}"

  get_lnurl_pay=$(get_lnurl_pay ${lnurl_pay_id} | jq 'del(.result.updatedAt)')
  trace 3 "[pay_to_deleted] get_lnurl_pay=${get_lnurl_pay}"
  equals=$(jq --argjson a "${deleted}" --argjson b "${get_lnurl_pay}" -n '$a == $b')
  trace 3 "[pay_to_deleted] equals=${equals}"
  if [ "${equals}" = "true" ]; then
    trace 2 "[pay_to_deleted] EQUALS!"
  else
    trace 1 "\n\n[pay_to_deleted] ${On_Red}${BBlack} Pay to deleted: NOT EQUALS!                                                                          ${Color_Off}\n"
    return 1
  fi

  # Delete it twice...
  trace 3 "[pay_to_deleted] Let's delete it again..."
  delete_lnurl_pay=$(delete_lnurl_pay ${lnurl_pay_id})
  trace 3 "[pay_to_deleted] delete_lnurl_pay=${delete_lnurl_pay}"
  echo "${delete_lnurl_pay}" | grep -qi "already deactivated"
  if [ "$?" -ne "0" ]; then
    trace 1 "\n\n[pay_to_deleted] ${On_Red}${BBlack} Pay to deleted: Should return an error because already deactivated!                                 ${Color_Off}\n"
    return 1
  else
    trace 1 "[pay_to_deleted] DELETED!  Good!..."
  fi

  # 9. User calls LNServicePay
  local payRequestResponse2=$(call_lnservice_pay_request "${serviceUrl}")
  trace 3 "[pay_to_deleted] payRequestResponse2=${payRequestResponse2}"

  echo "${payRequestResponse2}" | grep -qi "Deactivated"
  if [ "$?" -ne "0" ]; then
    trace 1 "\n\n[pay_to_deleted] ${On_Red}${BBlack} Pay to deleted: NOT DELETED!                                                                         ${Color_Off}\n"
    return 1
  else
    trace 1 "\n\n[pay_to_deleted] ${On_IGreen}${BBlack} Pay to deleted: SUCCESS!                                                                       ${Color_Off}\n"
  fi

  # 10. User calls LNServicePayRequest
  payResponse=$(call_lnservice_pay "${payRequestResponse}" ${externalIdRandom})
  trace 3 "[pay_to_deleted] payResponse=${payResponse}"

  echo "${payResponse}" | grep -qi "Deactivated"
  if [ "$?" -ne "0" ]; then
    trace 1 "\n\n[pay_to_deleted] ${On_Red}${BBlack} Pay to deleted: NOT DELETED!                                                                         ${Color_Off}\n"
    return 1
  else
    trace 1 "\n\n[pay_to_deleted] ${On_IGreen}${BBlack} Pay to deleted: SUCCESS!                                                                       ${Color_Off}\n"
  fi
}

start_callback_server() {
  trace 1 "\n\n[start_callback_server] ${BCyan}Let's start a callback server!...${Color_Off}\n"

  port=${1:-${callbackserverport}}
  conainerseq=${2}

  docker run --rm -t --name tests-lnurl-pay-cb${conainerseq} --network=cyphernodeappsnet alpine sh -c \
  "nc -vlp${port} -e sh -c 'echo -en \"HTTP/1.1 200 OK\\\\r\\\\n\\\\r\\\\n\" ; echo -en \"\\033[40m\\033[0;37m\" >&2 ; date >&2 ; timeout 1 tee /dev/tty | cat ; echo -e \"\033[0m\" >&2'" &
  sleep 2
  # docker network connect cyphernodenet tests-lnurl-withdraw-cb${conainerseq}
}

TRACING=3

date

stop_test_container
start_test_container

callbackserverport="1111"
callbackservername="tests-lnurl-pay-cb"
callbackurl="http://${callbackservername}:${callbackserverport}"

min_max_range=1000

trace 1 "\n\n[test-lnurl-pay] ${BCyan}Installing needed packages...${Color_Off}\n"
exec_in_test_container_leave_lf apk add --update curl

ln_reconnect

happy_path "${callbackurl}" \
&& invalid_creation "${callbackurl}" \
&& invalid_payment "${callbackurl}" \
&& pay_to_deleted "${callbackurl}"

trace 1 "\n\n[test-lnurl-pay] ${BCyan}Tearing down...${Color_Off}\n"
wait

stop_test_container

date

trace 1 "\n\n[test-lnurl-pay] ${BCyan}See ya!${Color_Off}\n"
