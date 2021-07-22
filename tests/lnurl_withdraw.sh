#!/bin/sh

. ./tests/colors.sh

echo -e "${Color_Off}"
date

# Install needed packages
echo -e "\n${BCyan}Installing needed packages...${Color_Off}"
apk add curl jq

# Initializing test variables
echo -e "\n${BCyan}Initializing test variables...${Color_Off}"
callbackservername="cb"
callbackserverport="1111"
callbackurl="http://${callbackservername}:${callbackserverport}"

invoicenumber=$RANDOM
amount=$((10000+${invoicenumber}))
expiration=$(date -d @$(($(date +"%s")+3600)) +"%F %T")
#echo "invoicenumber=${invoicenumber}"
#echo "amount=${amount}"
#echo "expiration=${expiration}"

# Get config from lnurl cypherapp
echo -e "\n${BCyan}Getting configuration from lnurl cypherapp...${Color_Off}"
data='{"id":0,"method":"getConfig","params":[]}'
lnurlConfig=$(curl -sd "${data}" -H "Content-Type: application/json" lnurl:8000/api)
#echo "lnurlConfig=${lnurlConfig}"
lnServicePrefix=$(echo "${lnurlConfig}" | jq -r '.result | "\(.LN_SERVICE_SERVER):\(.LN_SERVICE_PORT)\(.LN_SERVICE_CTX)"')
#echo "lnServicePrefix=${lnServicePrefix}"

# Service creates LNURL Withdraw
echo -e "\n${BCyan}Service creates LNURL Withdraw...${Color_Off}"
data='{"id":0,"method":"createLnurlWithdraw","params":{"amount":'${amount}',"description":"desc'${invoicenumber}'","expiration":"'${expiration}'","secretToken":"secret'${invoicenumber}'","webhookUrl":"'${callbackurl}'/lnurl/inv'${invoicenumber}'"}}'
#echo "data=${data}"
#echo "Calling createLnurlWithdraw..."
createLnurlWithdraw=$(curl -sd "${data}" -H "Content-Type: application/json" lnurl:8000/api)
#echo "createLnurlWithdraw=${createLnurlWithdraw}"

# {"id":0,"result":{"amount":0.01,"description":"desc01","expiration":"2021-07-15 12:12","secretToken":"abc01","webhookUrl":"https://webhookUrl01","lnurl":"LNURL1DP68GUP69UHJUMMWD9HKUW3CXQHKCMN4WFKZ7AMFW35XGUNPWAFX2UT4V4EHG0MN84SKYCESXYH8P25K","withdrawnDetails":null,"withdrawnTimestamp":null,"active":1,"lnurlWithdrawId":1,"createdAt":"2021-07-15 19:42:06","updatedAt":"2021-07-15 19:42:06"}}
lnurl=$(echo "${createLnurlWithdraw}" | jq -r ".result.lnurl")
echo "lnurl=${lnurl}"

# Decode LNURL
echo -e "\n${BCyan}Decoding LNURL...${Color_Off}"
data='{"id":0,"method":"decodeBech32","params":{"s":"'${lnurl}'"}}'
#echo ; echo "data=${data}"
decodedLnurl=$(curl -sd "${data}" -H "Content-Type: application/json" lnurl:8000/api)
echo "decodedLnurl=${decodedLnurl}"
urlSuffix=$(echo "${decodedLnurl}" | jq -r ".result" | sed 's|'${lnServicePrefix}'||g')
#echo "urlSuffix=${urlSuffix}"

# User calls LN Service LNURL Withdraw Request
echo -e "\n${BCyan}User calls LN Service LNURL Withdraw Request...${Color_Off}"
withdrawRequestResponse=$(curl -s lnurl:8000${urlSuffix})
echo "withdrawRequestResponse=${withdrawRequestResponse}"

# User calls LN Service LNURL Withdraw
echo -e "\n${BCyan}User prepares call to LN Service LNURL Withdraw...${Color_Off}"
callback=$(echo "${withdrawRequestResponse}" | jq -r ".callback")
#echo "callback=${callback}"
urlSuffix=$(echo "${callback}" | sed 's|'${lnServicePrefix}'||g')
#echo "urlSuffix=${urlSuffix}"
k1=$(echo "${withdrawRequestResponse}" | jq -r ".k1")
#echo "k1=${k1}"

# Create bolt11 for LN Service LNURL Withdraw
echo -e "\n${BCyan}User creates bolt11 for the payment...${Color_Off}"
label="invoice${invoicenumber}"
desc="Invoice number ${invoicenumber}"
data='{"id":1,"jsonrpc": "2.0","method":"invoice","params":{"msatoshi":'${amount}',"label":"'${label}'","description":"'${desc}'"}}'
#echo ; echo "data=${data}"
invoice=$(curl -sd "${data}" -H 'X-Access:FoeDdQw5yl7pPfqdlGy3OEk/txGqyJjSbVtffhzs7kc=' -H "Content-Type: application/json" cyphernode_sparkwallet2:9737/rpc)
#echo "invoice=${invoice}"
bolt11=$(echo ${invoice} | jq -r ".bolt11")
echo "bolt11=${bolt11}"

# We want to see that that invoice is unpaid first...
echo -e "\n${BCyan}Let's make sure the invoice is unpaid first...${Color_Off}"
payment_hash=$(echo "${invoice}" | jq -r ".payment_hash")
#echo "payment_hash=${payment_hash}"
data='{"id":1,"jsonrpc": "2.0","method":"listinvoices","params":{"payment_hash":"'${payment_hash}'"}}'
#echo "data=${data}"
invoices=$(curl -sd "${data}" -H 'X-Access:FoeDdQw5yl7pPfqdlGy3OEk/txGqyJjSbVtffhzs7kc=' -H "Content-Type: application/json" cyphernode_sparkwallet2:9737/rpc)
#echo "invoices=${invoices}"
status=$(echo "${invoices}" | jq -r ".invoices[0].status")
echo "status=${status}"

# Actual call to LN Service LNURL Withdraw
echo -e "\n${BCyan}User finally calls LN Service LNURL Withdraw...${Color_Off}"
withdrawResponse=$(curl -s lnurl:8000${urlSuffix}?k1=${k1}\&pr=${bolt11})
echo "withdrawResponse=${withdrawResponse}"

# We want to see if payment received (invoice status paid)
echo -e "\n${BCyan}Sleeping 5 seconds...${Color_Off}"
sleep 5
echo -e "\n${BCyan}Let's see if invoice is paid...${Color_Off}"
invoices=$(curl -sd "${data}" -H 'X-Access:FoeDdQw5yl7pPfqdlGy3OEk/txGqyJjSbVtffhzs7kc=' -H "Content-Type: application/json" cyphernode_sparkwallet2:9737/rpc)
#echo "invoices=${invoices}"
status=$(echo "${invoices}" | jq -r ".invoices[0].status")
echo "status=${status}"

if [ "${status}" = "paid" ]; then
  echo -e "\n${BGreen}SUCCESS!${Color_Off}\n"
  date
  return 0
else
  echo -e "\n${BRed}FAILURE!${Color_Off}\n"
  date
  return 1
fi

