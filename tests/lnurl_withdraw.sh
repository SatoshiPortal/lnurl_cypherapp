#!/bin/sh

# Happy path:

# 1. Create a LNURL Withdraw
# 2. Get it and compare
# 3. User calls LNServiceWithdrawRequest with wrong k1 -> Error, wrong k1!
# 4. User calls LNServiceWithdrawRequest
# 5. User calls LNServiceWithdraw with wrong k1 -> Error, wrong k1!
# 6. User calls LNServiceWithdraw

# Expired 1:

# 1. Create a LNURL Withdraw with expiration=now
# 2. Get it and compare
# 3. User calls LNServiceWithdrawRequest -> Error, expired!

# Expired 2:

# 1. Create a LNURL Withdraw with expiration=now + 5 seconds
# 2. Get it and compare
# 3. User calls LNServiceWithdrawRequest
# 4. Sleep 5 seconds
# 5. User calls LNServiceWithdraw -> Error, expired!

# Deleted 1:

# 1. Create a LNURL Withdraw with expiration=now
# 2. Get it and compare
# 3. Delete it
# 4. Get it and compare
# 5. User calls LNServiceWithdrawRequest -> Error, deleted!

# Deleted 2:

# 1. Create a LNURL Withdraw with expiration=now + 5 seconds
# 2. Get it and compare
# 3. User calls LNServiceWithdrawRequest
# 4. Delete it
# 5. User calls LNServiceWithdraw -> Error, deleted!

# fallback 1, use of Bitcoin fallback address:

# 1. Cyphernode.getnewaddress -> btcfallbackaddr
# 2. Cyphernode.watch btcfallbackaddr
# 3. Listen to watch webhook
# 4. Create a LNURL Withdraw with expiration=now and a btcfallbackaddr
# 5. Get it and compare
# 6. User calls LNServiceWithdrawRequest -> Error, expired!
# 7. Fallback should be triggered, LNURL callback called (port 1111), Cyphernode's watch callback called (port 1112)
# 8. Mined block and Cyphernode's confirmed watch callback called (port 1113)

# fallback 2, use of Bitcoin fallback address in a batched spend:

# 1. Cyphernode.getnewaddress -> btcfallbackaddr
# 2. Cyphernode.watch btcfallbackaddr
# 3. Listen to watch webhook
# 4. Create a LNURL Withdraw with expiration=now and a btcfallbackaddr
# 5. Get it and compare
# 6. User calls LNServiceWithdrawRequest -> Error, expired!
# 7. Fallback should be triggered, added to current batch using the Batcher
# 8. Wait for the batch to execute, LNURL callback called (port 1111), Cyphernode's watch callback called (port 1112), Batcher's execute callback called (port 1113)
# 9. Mined block and Cyphernode's confirmed watch callback called (port 1114)

. ./tests/colors.sh

trace() {
  if [ "${1}" -le "${TRACING}" ]; then
    local str="$(date -Is) $$ ${2}"
    echo -e "${str}" >&2
  fi
}

create_lnurl_withdraw() {
  trace 2 "\n\n[create_lnurl_withdraw] ${BCyan}Service creates LNURL Withdraw...${Color_Off}\n"

  local callbackurl=${1}

  local invoicenumber=${3:-$RANDOM}
  trace 3 "[create_lnurl_withdraw] invoicenumber=${invoicenumber}"
  local msatoshi=$((500000+${invoicenumber}))
  trace 3 "[create_lnurl_withdraw] msatoshi=${msatoshi}"
  local expiration_offset=${2:-0}
  local expiration=$(date -d @$(($(date -u +"%s")+${expiration_offset})) +"%Y-%m-%dT%H:%M:%SZ")
  trace 3 "[create_lnurl_withdraw] expiration=${expiration}"
  local fallback_addr=${4:-""}
  local fallback_batched=${5:-"false"}

  # Service creates LNURL Withdraw
  data='{"id":0,"method":"createLnurlWithdraw","params":{"msatoshi":'${msatoshi}',"description":"desc'${invoicenumber}'","expiresAt":"'${expiration}'","webhookUrl":"'${callbackurl}'/lnurl/inv'${invoicenumber}'","btcFallbackAddress":"'${fallback_addr}'","batchFallback":'${fallback_batched}'}}'
  trace 3 "[create_lnurl_withdraw] data=${data}"
  trace 3 "[create_lnurl_withdraw] Calling createLnurlWithdraw..."
  local createLnurlWithdraw=$(curl -sd "${data}" -H "Content-Type: application/json" lnurl:8000/api)
  trace 3 "[create_lnurl_withdraw] createLnurlWithdraw=${createLnurlWithdraw}"

  # {"id":0,"result":{"msatoshi":100000000,"description":"desc01","expiresAt":"2021-07-15T12:12:23.112Z","secretToken":"abc01","webhookUrl":"https://webhookUrl01","lnurl":"LNURL1DP68GUP69UHJUMMWD9HKUW3CXQHKCMN4WFKZ7AMFW35XGUNPWAFX2UT4V4EHG0MN84SKYCESXYH8P25K","withdrawnDetails":null,"withdrawnTimestamp":null,"active":1,"lnurlWithdrawId":1,"createdAt":"2021-07-15 19:42:06","updatedAt":"2021-07-15 19:42:06"}}
  local lnurl=$(echo "${createLnurlWithdraw}" | jq -r ".result.lnurl")
  trace 3 "[create_lnurl_withdraw] lnurl=${lnurl}"

  echo "${createLnurlWithdraw}"
}

get_lnurl_withdraw() {
  trace 2 "\n\n[get_lnurl_withdraw] ${BCyan}Get LNURL Withdraw...${Color_Off}\n"

  local lnurl_withdraw_id=${1}
  trace 3 "[get_lnurl_withdraw] lnurl_withdraw_id=${lnurl_withdraw_id}"

  # Service creates LNURL Withdraw
  data='{"id":0,"method":"getLnurlWithdraw","params":{"lnurlWithdrawId":'${lnurl_withdraw_id}'}}'
  trace 3 "[get_lnurl_withdraw] data=${data}"
  trace 3 "[get_lnurl_withdraw] Calling getLnurlWithdraw..."
  local getLnurlWithdraw=$(curl -sd "${data}" -H "Content-Type: application/json" lnurl:8000/api)
  trace 3 "[get_lnurl_withdraw] getLnurlWithdraw=${getLnurlWithdraw}"

  echo "${getLnurlWithdraw}"
}

delete_lnurl_withdraw() {
  trace 2 "\n\n[delete_lnurl_withdraw] ${BCyan}Delete LNURL Withdraw...${Color_Off}\n"

  local lnurl_withdraw_id=${1}
  trace 3 "[delete_lnurl_withdraw] lnurl_withdraw_id=${lnurl_withdraw_id}"

  # Service deletes LNURL Withdraw
  data='{"id":0,"method":"deleteLnurlWithdraw","params":{"lnurlWithdrawId":'${lnurl_withdraw_id}'}}'
  trace 3 "[delete_lnurl_withdraw] data=${data}"
  trace 3 "[delete_lnurl_withdraw] Calling deleteLnurlWithdraw..."
  local deleteLnurlWithdraw=$(curl -sd "${data}" -H "Content-Type: application/json" lnurl:8000/api)
  trace 3 "[delete_lnurl_withdraw] deleteLnurlWithdraw=${deleteLnurlWithdraw}"

  local deleted=$(echo "${deleteLnurlWithdraw}" | jq ".result.deleted")
  if [ "${deleted}" = "false" ]; then
    trace 2 "[delete_lnurl_withdraw] ${On_Red}${BBlack} NOT DELETED!                                                                          ${Color_Off}"
    return 1
  fi

  echo "${deleteLnurlWithdraw}"
}

decode_lnurl() {
  trace 2 "\n\n[decode_lnurl] ${BCyan}Decoding LNURL...${Color_Off}\n"

  local lnurl=${1}
  local lnServicePrefix=${2}

  local data='{"id":0,"method":"decodeBech32","params":{"s":"'${lnurl}'"}}'
  trace 3 "[decode_lnurl] data=${data}"
  local decodedLnurl=$(curl -sd "${data}" -H "Content-Type: application/json" lnurl:8000/api)
  trace 3 "[decode_lnurl] decodedLnurl=${decodedLnurl}"
  local urlSuffix=$(echo "${decodedLnurl}" | jq -r ".result" | sed 's|'${lnServicePrefix}'||g')
  trace 3 "[decode_lnurl] urlSuffix=${urlSuffix}"

  echo "${urlSuffix}"
}

call_lnservice_withdraw_request() {
  trace 2 "\n\n[call_lnservice_withdraw_request] ${BCyan}User calls LN Service LNURL Withdraw Request...${Color_Off}\n"

  local urlSuffix=${1}

  local withdrawRequestResponse=$(curl -s lnurl:8000${urlSuffix})
  trace 3 "[call_lnservice_withdraw_request] withdrawRequestResponse=${withdrawRequestResponse}"

  echo "${withdrawRequestResponse}"
}

create_bolt11() {
  trace 2 "\n\n[create_bolt11] ${BCyan}User creates bolt11 for the payment...${Color_Off}\n"

  local msatoshi=${1}
  trace 3 "[create_bolt11] msatoshi=${msatoshi}"
  local desc=${2}
  trace 3 "[create_bolt11] desc=${desc}"

  local data='{"id":1,"jsonrpc": "2.0","method":"invoice","params":{"msatoshi":'${msatoshi}',"label":"'${desc}'","description":"'${desc}'"}}'
  trace 3 "[create_bolt11] data=${data}"
  local invoice=$(curl -sd "${data}" -H 'X-Access:FoeDdQw5yl7pPfqdlGy3OEk/txGqyJjSbVtffhzs7kc=' -H "Content-Type: application/json" cyphernode_sparkwallet2:9737/rpc)
  trace 3 "[create_bolt11] invoice=${invoice}"

  echo "${invoice}"
}

get_invoice_status() {
  trace 2 "\n\n[get_invoice_status] ${BCyan}Let's make sure the invoice is unpaid first...${Color_Off}\n"

  local invoice=${1}
  trace 3 "[get_invoice_status] invoice=${invoice}"

  local payment_hash=$(echo "${invoice}" | jq -r ".payment_hash")
  trace 3 "[get_invoice_status] payment_hash=${payment_hash}"
  local data='{"id":1,"jsonrpc": "2.0","method":"listinvoices","params":{"payment_hash":"'${payment_hash}'"}}'
  trace 3 "[get_invoice_status] data=${data}"
  local invoices=$(curl -sd "${data}" -H 'X-Access:FoeDdQw5yl7pPfqdlGy3OEk/txGqyJjSbVtffhzs7kc=' -H "Content-Type: application/json" cyphernode_sparkwallet2:9737/rpc)
  trace 3 "[get_invoice_status] invoices=${invoices}"
  local status=$(echo "${invoices}" | jq -r ".invoices[0].status")
  trace 3 "[get_invoice_status] status=${status}"

  echo "${status}"
}

call_lnservice_withdraw() {
  trace 2 "\n\n[call_lnservice_withdraw] ${BCyan}User prepares call to LN Service LNURL Withdraw...${Color_Off}\n"

  local withdrawRequestResponse=${1}
  local lnServicePrefix=${2}
  local bolt11=${3}

  callback=$(echo "${withdrawRequestResponse}" | jq -r ".callback")
  trace 3 "[call_lnservice_withdraw] callback=${callback}"
  urlSuffix=$(echo "${callback}" | sed 's|'${lnServicePrefix}'||g')
  trace 3 "[call_lnservice_withdraw] urlSuffix=${urlSuffix}"
  k1=$(echo "${withdrawRequestResponse}" | jq -r ".k1")
  trace 3 "[call_lnservice_withdraw] k1=${k1}"

  trace 3 "\n[call_lnservice_withdraw] ${BCyan}User finally calls LN Service LNURL Withdraw...${Color_Off}"
  withdrawResponse=$(curl -s lnurl:8000${urlSuffix}?k1=${k1}\&pr=${bolt11})
  trace 3 "[call_lnservice_withdraw] withdrawResponse=${withdrawResponse}"

  echo "${withdrawResponse}"
}

happy_path() {
  # Happy path:
  #
  # 1. Create a LNURL Withdraw
  # 2. Get it and compare
  # 3. User calls LNServiceWithdrawRequest with wrong k1 -> Error, wrong k1!
  # 3. User calls LNServiceWithdrawRequest
  # 4. User calls LNServiceWithdraw with wrong k1 -> Error, wrong k1!
  # 4. User calls LNServiceWithdraw

  trace 1 "\n\n[happy_path] ${On_Yellow}${BBlack} Happy path:                                                                     ${Color_Off}\n"

  local callbackurl=${1}
  local lnServicePrefix=${2}

  # Service creates LNURL Withdraw
  local createLnurlWithdraw=$(create_lnurl_withdraw "${callbackurl}" 15)
  trace 3 "[happy_path] createLnurlWithdraw=${createLnurlWithdraw}"
  local lnurl=$(echo "${createLnurlWithdraw}" | jq -r ".result.lnurl")
  trace 3 "lnurl=${lnurl}"

  local lnurl_withdraw_id=$(echo "${createLnurlWithdraw}" | jq -r ".result.lnurlWithdrawId")
  local get_lnurl_withdraw=$(get_lnurl_withdraw ${lnurl_withdraw_id})
  trace 3 "[happy_path] get_lnurl_withdraw=${get_lnurl_withdraw}"
  local equals=$(jq --argjson a "${createLnurlWithdraw}" --argjson b "${get_lnurl_withdraw}" -n '$a == $b')
  trace 3 "[happy_path] equals=${equals}"
  if [ "${equals}" = "true" ]; then
    trace 2 "[happy_path] EQUALS!"
  else
    trace 1 "\n[happy_path] ${On_Red}${BBlack}  Happy path: NOT EQUALS!                                                                          ${Color_Off}\n"
    return 1
  fi

  # Decode LNURL
  local urlSuffix=$(decode_lnurl "${lnurl}" "${lnServicePrefix}")
  trace 3 "[happy_path] urlSuffix=${urlSuffix}"

  # User calls LN Service LNURL Withdraw Request
  local withdrawRequestResponse=$(call_lnservice_withdraw_request "${urlSuffix}")
  trace 3 "[happy_path] withdrawRequestResponse=${withdrawRequestResponse}"

  # Create bolt11 for LN Service LNURL Withdraw
  local msatoshi=$(echo "${createLnurlWithdraw}" | jq -r '.result.msatoshi')
  local description=$(echo "${createLnurlWithdraw}" | jq -r '.result.description')
  local invoice=$(create_bolt11 "${msatoshi}" "${description}")
  trace 3 "[happy_path] invoice=${invoice}"
  local bolt11=$(echo ${invoice} | jq -r ".bolt11")
  trace 3 "[happy_path] bolt11=${bolt11}"

  # We want to see that that invoice is unpaid first...
  local status=$(get_invoice_status "${invoice}")
  trace 3 "[happy_path] status=${status}"

  start_callback_server

  # User calls LN Service LNURL Withdraw
  local withdrawResponse=$(call_lnservice_withdraw "${withdrawRequestResponse}" "${lnServicePrefix}" "${bolt11}")
  trace 3 "[happy_path] withdrawResponse=${withdrawResponse}"

  wait

  # We want to see if payment received (invoice status paid)
  status=$(get_invoice_status "${invoice}")
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

expired1() {
  # Expired 1:
  #
  # 1. Create a LNURL Withdraw with expiration=now
  # 2. Get it and compare
  # 3. User calls LNServiceWithdrawRequest -> Error, expired!

  trace 1 "\n\n[expired1] ${On_Yellow}${BBlack} Expired 1:                                                                        ${Color_Off}\n"

  local callbackurl=${1}
  local lnServicePrefix=${2}

  # Service creates LNURL Withdraw
  local createLnurlWithdraw=$(create_lnurl_withdraw "${callbackurl}" 0)
  trace 3 "[expired1] createLnurlWithdraw=${createLnurlWithdraw}"
  local lnurl=$(echo "${createLnurlWithdraw}" | jq -r ".result.lnurl")
  trace 3 "lnurl=${lnurl}"

  local lnurl_withdraw_id=$(echo "${createLnurlWithdraw}" | jq -r ".result.lnurlWithdrawId")
  local get_lnurl_withdraw=$(get_lnurl_withdraw ${lnurl_withdraw_id})
  trace 3 "[expired1] get_lnurl_withdraw=${get_lnurl_withdraw}"
  local equals=$(jq --argjson a "${createLnurlWithdraw}" --argjson b "${get_lnurl_withdraw}" -n '$a == $b')
  trace 3 "[expired1] equals=${equals}"
  if [ "${equals}" = "true" ]; then
    trace 2 "[expired1] EQUALS!"
  else
    trace 1 "\n\n[expired1] ${On_Red}${BBlack} Expired 1: NOT EQUALS!                                                                          ${Color_Off}\n"
    return 1
  fi

  # Decode LNURL
  local urlSuffix=$(decode_lnurl "${lnurl}" "${lnServicePrefix}")
  trace 3 "[expired1] urlSuffix=${urlSuffix}"

  # User calls LN Service LNURL Withdraw Request
  local withdrawRequestResponse=$(call_lnservice_withdraw_request "${urlSuffix}")
  trace 3 "[expired1] withdrawRequestResponse=${withdrawRequestResponse}"

  echo "${withdrawRequestResponse}" | grep -qi "expired"
  if [ "$?" -ne "0" ]; then
    trace 1 "\n\n[expired1] ${On_Red}${BBlack} Expired 1: NOT EXPIRED!                                                                         ${Color_Off}\n"
    return 1
  else
    trace 1 "\n\n[expired1] ${On_IGreen}${BBlack} Expired 1: SUCCESS!                                                                       ${Color_Off}\n"
  fi
}

expired2() {
  # Expired 2:
  #
  # 1. Create a LNURL Withdraw with expiration=now + 5 seconds
  # 2. Get it and compare
  # 3. User calls LNServiceWithdrawRequest
  # 4. Sleep 5 seconds
  # 5. User calls LNServiceWithdraw -> Error, expired!

  trace 1 "\n\n[expired2] ${On_Yellow}${BBlack} Expired 2:                                                                        ${Color_Off}\n"

  local callbackurl=${1}
  local lnServicePrefix=${2}

  # Service creates LNURL Withdraw
  local createLnurlWithdraw=$(create_lnurl_withdraw "${callbackurl}" 5)
  trace 3 "[expired2] createLnurlWithdraw=${createLnurlWithdraw}"
  local lnurl=$(echo "${createLnurlWithdraw}" | jq -r ".result.lnurl")
  trace 3 "lnurl=${lnurl}"

  local lnurl_withdraw_id=$(echo "${createLnurlWithdraw}" | jq -r ".result.lnurlWithdrawId")
  local get_lnurl_withdraw=$(get_lnurl_withdraw ${lnurl_withdraw_id})
  trace 3 "[expired2] get_lnurl_withdraw=${get_lnurl_withdraw}"
  local equals=$(jq --argjson a "${createLnurlWithdraw}" --argjson b "${get_lnurl_withdraw}" -n '$a == $b')
  trace 3 "[expired2] equals=${equals}"
  if [ "${equals}" = "true" ]; then
    trace 2 "[expired2] EQUALS!"
  else
    trace 1 "\n\n[expired2] ${On_Red}${BBlack} Expired 2: NOT EQUALS!                                                                          ${Color_Off}\n"
    return 1
  fi

  # Decode LNURL
  local urlSuffix=$(decode_lnurl "${lnurl}" "${lnServicePrefix}")
  trace 3 "[expired2] urlSuffix=${urlSuffix}"

  # User calls LN Service LNURL Withdraw Request
  local withdrawRequestResponse=$(call_lnservice_withdraw_request "${urlSuffix}")
  trace 3 "[expired2] withdrawRequestResponse=${withdrawRequestResponse}"

  # Create bolt11 for LN Service LNURL Withdraw
  local msatoshi=$(echo "${createLnurlWithdraw}" | jq -r '.result.msatoshi')
  local description=$(echo "${createLnurlWithdraw}" | jq -r '.result.description')
  local invoice=$(create_bolt11 "${msatoshi}" "${description}")
  trace 3 "[expired2] invoice=${invoice}"
  local bolt11=$(echo ${invoice} | jq -r ".bolt11")
  trace 3 "[expired2] bolt11=${bolt11}"

  trace 3 "[expired2] Sleeping 5 seconds..."
  sleep 5

  # User calls LN Service LNURL Withdraw
  local withdrawResponse=$(call_lnservice_withdraw "${withdrawRequestResponse}" "${lnServicePrefix}" "${bolt11}")
  trace 3 "[expired2] withdrawResponse=${withdrawResponse}"

  echo "${withdrawResponse}" | grep -qi "expired"
  if [ "$?" -ne "0" ]; then
    trace 1 "\n\n[expired2] ${On_Red}${BBlack} Expired 2: NOT EXPIRED!                                                                         ${Color_Off}\n"
    return 1
  else
    trace 1 "\n\n[expired2] ${On_IGreen}${BBlack} Expired 2: SUCCESS!                                                                       ${Color_Off}\n"
  fi
}

deleted1() {
  # Deleted 1:
  #
  # 1. Create a LNURL Withdraw with expiration=now
  # 2. Get it and compare
  # 3. Delete it
  # 4. Get it and compare
  # 5. User calls LNServiceWithdrawRequest -> Error, deleted!

  trace 1 "\n\n[deleted1] ${On_Yellow}${BBlack} Deleted 1:                                                                        ${Color_Off}\n"

  local callbackurl=${1}
  local lnServicePrefix=${2}

  # Service creates LNURL Withdraw
  local createLnurlWithdraw=$(create_lnurl_withdraw "${callbackurl}" 0)
  trace 3 "[deleted1] createLnurlWithdraw=${createLnurlWithdraw}"
  local lnurl=$(echo "${createLnurlWithdraw}" | jq -r ".result.lnurl")
  trace 3 "lnurl=${lnurl}"

  local lnurl_withdraw_id=$(echo "${createLnurlWithdraw}" | jq -r ".result.lnurlWithdrawId")
  local get_lnurl_withdraw=$(get_lnurl_withdraw ${lnurl_withdraw_id})
  trace 3 "[deleted1] get_lnurl_withdraw=${get_lnurl_withdraw}"
  local equals=$(jq --argjson a "${createLnurlWithdraw}" --argjson b "${get_lnurl_withdraw}" -n '$a == $b')
  trace 3 "[deleted1] equals=${equals}"
  if [ "${equals}" = "true" ]; then
    trace 2 "[deleted1] EQUALS!"
  else
    trace 1 "\n\n[deleted1] ${On_Red}${BBlack} Deleted 1: NOT EQUALS!                                                                          ${Color_Off}\n"
    return 1
  fi

  local delete_lnurl_withdraw=$(delete_lnurl_withdraw ${lnurl_withdraw_id})
  trace 3 "[deleted1] delete_lnurl_withdraw=${delete_lnurl_withdraw}"
  local deleted=$(echo "${get_lnurl_withdraw}" | jq '.result.deleted = true | del(.result.updatedAt)')
  trace 3 "[deleted1] deleted=${deleted}"

  get_lnurl_withdraw=$(get_lnurl_withdraw ${lnurl_withdraw_id} | jq 'del(.result.updatedAt)')
  trace 3 "[deleted1] get_lnurl_withdraw=${get_lnurl_withdraw}"
  equals=$(jq --argjson a "${deleted}" --argjson b "${get_lnurl_withdraw}" -n '$a == $b')
  trace 3 "[deleted1] equals=${equals}"
  if [ "${equals}" = "true" ]; then
    trace 2 "[deleted1] EQUALS!"
  else
    trace 1 "\n\n[deleted1] ${On_Red}${BBlack} Deleted 1: NOT EQUALS!                                                                          ${Color_Off}\n"
    return 1
  fi

  # Delete it twice...
  trace 3 "[deleted1] Let's delete it again..."
  delete_lnurl_withdraw=$(delete_lnurl_withdraw ${lnurl_withdraw_id})
  trace 3 "[deleted1] delete_lnurl_withdraw=${delete_lnurl_withdraw}"
  echo "${delete_lnurl_withdraw}" | grep -qi "already deactivated"
  if [ "$?" -ne "0" ]; then
    trace 1 "\n\n[deleted1] ${On_Red}${BBlack} Deleted 1: Should return an error because already deactivated!                                 ${Color_Off}\n"
    return 1
  else
    trace 1 "\n\n[deleted1] ${On_IGreen}${BBlack} Deleted 1: SUCCESS!                                                                       ${Color_Off}\n"
  fi

  # Decode LNURL
  local urlSuffix=$(decode_lnurl "${lnurl}" "${lnServicePrefix}")
  trace 3 "[deleted1] urlSuffix=${urlSuffix}"

  # User calls LN Service LNURL Withdraw Request
  local withdrawRequestResponse=$(call_lnservice_withdraw_request "${urlSuffix}")
  trace 3 "[deleted1] withdrawRequestResponse=${withdrawRequestResponse}"

  echo "${withdrawRequestResponse}" | grep -qi "Deactivated"
  if [ "$?" -ne "0" ]; then
    trace 1 "\n\n[deleted1] ${On_Red}${BBlack} Deleted 1: NOT DELETED!                                                                         ${Color_Off}\n"
    return 1
  else
    trace 1 "\n\n[deleted1] ${On_IGreen}${BBlack} Deleted 1: SUCCESS!                                                                       ${Color_Off}\n"
  fi
}

deleted2() {
  # Deleted 2:
  #
  # 1. Create a LNURL Withdraw with expiration=now + 5 seconds
  # 2. Get it and compare
  # 5. User calls LNServiceWithdrawRequest
  # 3. Delete it
  # 5. User calls LNServiceWithdraw -> Error, deleted!

  trace 1 "\n\n[deleted2] ${On_Yellow}${BBlack} Deleted 2:                                                                        ${Color_Off}\n"

  local callbackurl=${1}
  local lnServicePrefix=${2}

  # Service creates LNURL Withdraw
  local createLnurlWithdraw=$(create_lnurl_withdraw "${callbackurl}" 5)
  trace 3 "[deleted2] createLnurlWithdraw=${createLnurlWithdraw}"
  local lnurl=$(echo "${createLnurlWithdraw}" | jq -r ".result.lnurl")
  trace 3 "lnurl=${lnurl}"

  local lnurl_withdraw_id=$(echo "${createLnurlWithdraw}" | jq -r ".result.lnurlWithdrawId")
  local get_lnurl_withdraw=$(get_lnurl_withdraw ${lnurl_withdraw_id})
  trace 3 "[deleted2] get_lnurl_withdraw=${get_lnurl_withdraw}"
  local equals=$(jq --argjson a "${createLnurlWithdraw}" --argjson b "${get_lnurl_withdraw}" -n '$a == $b')
  trace 3 "[deleted2] equals=${equals}"
  if [ "${equals}" = "true" ]; then
    trace 2 "[deleted2] EQUALS!"
  else
    trace 1 "\n\n[deleted2] ${On_Red}${BBlack} Deleted 2: NOT EQUALS!                                                                          ${Color_Off}\n"
    return 1
  fi

  # Decode LNURL
  local urlSuffix=$(decode_lnurl "${lnurl}" "${lnServicePrefix}")
  trace 3 "[deleted2] urlSuffix=${urlSuffix}"

  # User calls LN Service LNURL Withdraw Request
  local withdrawRequestResponse=$(call_lnservice_withdraw_request "${urlSuffix}")
  trace 3 "[deleted2] withdrawRequestResponse=${withdrawRequestResponse}"

  # Create bolt11 for LN Service LNURL Withdraw
  local msatoshi=$(echo "${createLnurlWithdraw}" | jq -r '.result.msatoshi')
  local description=$(echo "${createLnurlWithdraw}" | jq -r '.result.description')
  local invoice=$(create_bolt11 "${msatoshi}" "${description}")
  trace 3 "[deleted2] invoice=${invoice}"
  local bolt11=$(echo ${invoice} | jq -r ".bolt11")
  trace 3 "[deleted2] bolt11=${bolt11}"

  local delete_lnurl_withdraw=$(delete_lnurl_withdraw ${lnurl_withdraw_id})
  trace 3 "[deleted2] delete_lnurl_withdraw=${delete_lnurl_withdraw}"
  local deleted=$(echo "${get_lnurl_withdraw}" | jq '.result.deleted = true')
  trace 3 "[deleted2] deleted=${deleted}"

  # User calls LN Service LNURL Withdraw
  local withdrawResponse=$(call_lnservice_withdraw "${withdrawRequestResponse}" "${lnServicePrefix}" "${bolt11}")
  trace 3 "[deleted2] withdrawResponse=${withdrawResponse}"

  echo "${withdrawResponse}" | grep -qi "Deactivated"
  if [ "$?" -ne "0" ]; then
    trace 1 "\n\n[deleted2] ${On_Red}${BBlack} Deleted 2: NOT DELETED!                                                                         ${Color_Off}\n"
    return 1
  else
    trace 1 "\n\n[deleted2] ${On_IGreen}${BBlack} Deleted 2: SUCCESS!                                                                       ${Color_Off}\n"
  fi
}

fallback1() {
  # fallback 1, use of Bitcoin fallback address:
  #
  # 1. Cyphernode.getnewaddress -> btcfallbackaddr
  # 2. Cyphernode.watch btcfallbackaddr
  # 3. Listen to watch webhook
  # 4. Create a LNURL Withdraw with expiration=now and a btcfallbackaddr
  # 5. Get it and compare
  # 6. User calls LNServiceWithdrawRequest -> Error, expired!
  # 7. Fallback should be triggered, LNURL callback called (port 1111), Cyphernode's watch callback called (port 1112)
  # 8. Mined block and Cyphernode's confirmed watch callback called (port 1113)

  trace 1 "\n\n[fallback1] ${On_Yellow}${BBlack} Fallback 1:                                                                        ${Color_Off}\n"

  local callbackserver=${1}
  local callbackport=${2}
  local lnServicePrefix=${3}

  local zeroconfport=$((${callbackserverport}+1))
  local oneconfport=$((${callbackserverport}+2))
  local callbackurlCnWatch0conf="http://${callbackservername}:${zeroconfport}"
  local callbackurlCnWatch1conf="http://${callbackservername}:${oneconfport}"
  local callbackurl="http://${callbackservername}:${callbackserverport}"

  # Get new address
  local data='{"label":"lnurl_fallback_test"}'
  local btcfallbackaddr=$(curl -sd "${data}" -H "Content-Type: application/json" proxy:8888/getnewaddress)
  btcfallbackaddr=$(echo "${btcfallbackaddr}" | jq -r ".address")
  trace 3 "[fallback1] btcfallbackaddr=${btcfallbackaddr}"

  # Watch the address
  data='{"address":"'${btcfallbackaddr}'","unconfirmedCallbackURL":"'${callbackurlCnWatch0conf}'/callback0conf","confirmedCallbackURL":"'${callbackurlCnWatch1conf}'/callback1conf"}'
  local watchresponse=$(curl -sd "${data}" -H "Content-Type: application/json" proxy:8888/watch)
  trace 3 "[fallback1] watchresponse=${watchresponse}"

  # Service creates LNURL Withdraw
  local createLnurlWithdraw=$(create_lnurl_withdraw "${callbackurl}" 0 "" "${btcfallbackaddr}")
  trace 3 "[fallback1] createLnurlWithdraw=${createLnurlWithdraw}"
  local lnurl=$(echo "${createLnurlWithdraw}" | jq -r ".result.lnurl")
  trace 3 "[fallback1] lnurl=${lnurl}"

  local lnurl_withdraw_id=$(echo "${createLnurlWithdraw}" | jq -r ".result.lnurlWithdrawId")
  local get_lnurl_withdraw=$(get_lnurl_withdraw ${lnurl_withdraw_id})
  trace 3 "[fallback1] get_lnurl_withdraw=${get_lnurl_withdraw}"
  local equals=$(jq --argjson a "${createLnurlWithdraw}" --argjson b "${get_lnurl_withdraw}" -n '$a == $b')
  trace 3 "[fallback1] equals=${equals}"
  if [ "${equals}" = "true" ]; then
    trace 2 "[fallback1] EQUALS!"
  else
    trace 1 "\n\n[fallback1] ${On_Red}${BBlack} Fallback 1: NOT EQUALS!                                                                          ${Color_Off}\n"
    return 1
  fi

  # Decode LNURL
  local urlSuffix=$(decode_lnurl "${lnurl}" "${lnServicePrefix}")
  trace 3 "[fallback1] urlSuffix=${urlSuffix}"

  start_callback_server
  start_callback_server ${zeroconfport}
  start_callback_server ${oneconfport}

  # User calls LN Service LNURL Withdraw Request
  local withdrawRequestResponse=$(call_lnservice_withdraw_request "${urlSuffix}")
  trace 3 "[fallback1] withdrawRequestResponse=${withdrawRequestResponse}"

  echo "${withdrawRequestResponse}" | grep -qi "expired"
  if [ "$?" -ne "0" ]; then
    trace 1 "\n\n[fallback1] ${On_Red}${BBlack} Fallback 1: NOT EXPIRED!                                                                         ${Color_Off}\n"
    return 1
  else
    trace 2 "[fallback1] EXPIRED!"
  fi

  trace 3 "[fallback1] Waiting for fallback execution and a block mined..."

  wait

  trace 1 "\n\n[fallback1] ${On_IGreen}${BBlack} Fallback 1: SUCCESS!                                                                       ${Color_Off}\n"
}

fallback2() {
  # fallback 2, use of Bitcoin fallback address in a batched spend:
  #
  # 1. Cyphernode.getnewaddress -> btcfallbackaddr
  # 2. Cyphernode.watch btcfallbackaddr
  # 3. Listen to watch webhook
  # 4. Create a LNURL Withdraw with expiration=now and a btcfallbackaddr
  # 5. Get it and compare
  # 6. User calls LNServiceWithdrawRequest -> Error, expired!
  # 7. Fallback should be triggered, added to current batch using the Batcher
  # 8. Wait for the batch to execute, Batcher's execute callback called=>LNURL callback called (port 1111), Cyphernode's watch callback called (port 1112)
  # 9. Mined block and Cyphernode's confirmed watch callback called (port 1113)

  trace 1 "\n\n[fallback2] ${On_Yellow}${BBlack} Fallback 2:                                                                        ${Color_Off}\n"

  local callbackserver=${1}
  local callbackport=${2}
  local lnServicePrefix=${3}

  local zeroconfport=$((${callbackserverport}+1))
  local oneconfport=$((${callbackserverport}+2))
  local callbackurlCnWatch0conf="http://${callbackservername}:${zeroconfport}"
  local callbackurlCnWatch1conf="http://${callbackservername}:${oneconfport}"
  local callbackurl="http://${callbackservername}:${callbackserverport}"

  # Get new address
  local data='{"label":"lnurl_fallback_test"}'
  local btcfallbackaddr=$(curl -sd "${data}" -H "Content-Type: application/json" proxy:8888/getnewaddress)
  btcfallbackaddr=$(echo "${btcfallbackaddr}" | jq -r ".address")
  trace 3 "[fallback2] btcfallbackaddr=${btcfallbackaddr}"

  # Watch the address
  data='{"address":"'${btcfallbackaddr}'","unconfirmedCallbackURL":"'${callbackurlCnWatch0conf}'/callback0conf","confirmedCallbackURL":"'${callbackurlCnWatch1conf}'/callback1conf"}'
  local watchresponse=$(curl -sd "${data}" -H "Content-Type: application/json" proxy:8888/watch)
  trace 3 "[fallback2] watchresponse=${watchresponse}"

  # Service creates LNURL Withdraw with batching true
  local createLnurlWithdraw=$(create_lnurl_withdraw "${callbackurl}" 0 "" "${btcfallbackaddr}" "true")
  trace 3 "[fallback2] createLnurlWithdraw=${createLnurlWithdraw}"
  local lnurl=$(echo "${createLnurlWithdraw}" | jq -r ".result.lnurl")
  trace 3 "[fallback2] lnurl=${lnurl}"

  local lnurl_withdraw_id=$(echo "${createLnurlWithdraw}" | jq -r ".result.lnurlWithdrawId")
  local get_lnurl_withdraw=$(get_lnurl_withdraw ${lnurl_withdraw_id})
  trace 3 "[fallback2] get_lnurl_withdraw=${get_lnurl_withdraw}"
  local equals=$(jq --argjson a "${createLnurlWithdraw}" --argjson b "${get_lnurl_withdraw}" -n '$a == $b')
  trace 3 "[fallback2] equals=${equals}"
  if [ "${equals}" = "true" ]; then
    trace 2 "[fallback2] EQUALS!"
  else
    trace 1 "\n\n[fallback2] ${On_Red}${BBlack} Fallback 2: NOT EQUALS!                                                                          ${Color_Off}\n"
    return 1
  fi

  # Decode LNURL
  local urlSuffix=$(decode_lnurl "${lnurl}" "${lnServicePrefix}")
  trace 3 "[fallback2] urlSuffix=${urlSuffix}"

  # fallback batched callback
  start_callback_server

  # User calls LN Service LNURL Withdraw Request
  local withdrawRequestResponse=$(call_lnservice_withdraw_request "${urlSuffix}")
  trace 3 "[fallback2] withdrawRequestResponse=${withdrawRequestResponse}"

  echo "${withdrawRequestResponse}" | grep -qi "expired"
  if [ "$?" -ne "0" ]; then
    trace 1 "\n\n[fallback2] ${On_Red}${BBlack} Fallback 2: NOT EXPIRED!                                                                         ${Color_Off}\n"
    return 1
  else
    trace 2 "[fallback2] EXPIRED!"
  fi

  trace 3 "[fallback2] Waiting for fallback batched callback..."

  wait

  # fallback paid callback
  start_callback_server
  # 0-conf callback
  start_callback_server ${zeroconfport}
  # 1-conf callback
  start_callback_server ${oneconfport}

  trace 3 "[fallback2] Waiting for fallback execution and a block mined..."

  wait

  trace 1 "\n\n[fallback2] ${On_IGreen}${BBlack} Fallback 2: SUCCESS!                                                                       ${Color_Off}\n"
}

start_callback_server() {
  trace 1 "\n\n[start_callback_server] ${BCyan}Let's start a callback server!...${Color_Off}\n"

  port=${1:-${callbackserverport}}
  nc -vlp${port} -e sh -c 'echo -en "HTTP/1.1 200 OK\\r\\n\\r\\n" ; echo -en "'${On_Black}${White}'" >&2 ; date >&2 ; timeout 1 tee /dev/tty | cat ; echo -e "'${Color_Off}'" >&2' &
}

TRACING=3

trace 1 "${Color_Off}"
date

# Install needed packages
trace 2 "\n\n${BCyan}Installing needed packages...${Color_Off}\n"
apk add curl jq

# Initializing test variables
trace 2 "\n\n${BCyan}Initializing test variables...${Color_Off}\n"
callbackservername="lnurl_withdraw_test"
callbackserverport="1111"
callbackurl="http://${callbackservername}:${callbackserverport}"

# wait_for_callbacks

# Get config from lnurl cypherapp
trace 2 "\n\n${BCyan}Getting configuration from lnurl cypherapp...${Color_Off}\n"
data='{"id":0,"method":"getConfig","params":[]}'
lnurlConfig=$(curl -sd "${data}" -H "Content-Type: application/json" lnurl:8000/api)
trace 3 "lnurlConfig=${lnurlConfig}"
# lnServicePrefix=$(echo "${lnurlConfig}" | jq -r '.result | "\(.LN_SERVICE_SERVER):\(.LN_SERVICE_PORT)"')
lnServicePrefix=$(echo "${lnurlConfig}" | jq -r '.result | "\(.LN_SERVICE_SERVER)"')
trace 3 "lnServicePrefix=${lnServicePrefix}"

happy_path "${callbackurl}" "${lnServicePrefix}" \
&& expired1 "${callbackurl}" "${lnServicePrefix}" \
&& expired2 "${callbackurl}" "${lnServicePrefix}" \
&& deleted1 "${callbackurl}" "${lnServicePrefix}" \
&& deleted2 "${callbackurl}" "${lnServicePrefix}" \
&& fallback1 "${callbackservername}" "${callbackserverport}" "${lnServicePrefix}" \
&& fallback2 "${callbackservername}" "${callbackserverport}" "${lnServicePrefix}"

trace 1 "\n\n${BCyan}Finished, deleting this test container...${Color_Off}\n"
