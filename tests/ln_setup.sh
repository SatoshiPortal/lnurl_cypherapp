#!/bin/bash

# This is a helper script to create a balanced channel between lightning and lightning2

. ./mine.sh

date

# Get node2 connection string
connectstring2=$(echo "$(docker exec -it `docker ps -q -f "name=lightning2\."` lightning-cli getinfo | jq -r ".id")@lightning2:9735")
echo ; echo "connectstring2=${connectstring2}"

# Mine enough blocks
#mine 105
channelmsats=8000000000

# Fund LN node
address=$(docker exec -it `docker ps -q -f "name=proxy\."` curl localhost:8888/ln_newaddr | jq -r ".bech32")
echo ; echo "address=${address}"
data='{"address":"'${address}'","amount":1}'
docker exec -it `docker ps -q -f "name=proxy\."` curl -d "${data}" localhost:8888/spend

mine 6

echo ; echo "Sleeping 5 seconds..."
sleep 5

# Create a channel between the two nodes
data='{"peer":"'${connectstring2}'","msatoshi":'${channelmsats}'}'
echo ; echo "data=${data}"
docker exec -it `docker ps -q -f "name=proxy\."` curl -d "${data}" localhost:8888/ln_connectfund

echo ; echo "Sleeping 5 seconds..."
sleep 5

# Make the channel ready
mine 3

echo ; echo "Sleeping 15 seconds..."
sleep 15

# Balance the channel
invoicenumber=$RANDOM
msats=$((${channelmsats}/2))
label="invoice${invoicenumber}"
desc="Invoice number ${invoicenumber}"
echo ; echo "msats=${msats}"
echo "label=${label}"
echo "desc=${desc}"
invoice=$(docker exec -it `docker ps -q -f "name=lightning2\."` lightning-cli invoice ${msats} "${label}" "${desc}")
echo ; echo "invoice=${invoice}"

# Pay to rebalance channel
bolt11=$(echo ${invoice} | jq ".bolt11")
echo ; echo "bolt11=${bolt11}"
data='{"bolt11":'${bolt11}',"expected_msatoshi":'${msats}',"expected_description":"'${desc}'"}'
echo ; echo "data=${data}"
docker exec -it `docker ps -q -f "name=proxy\."` curl -d "${data}" localhost:8888/ln_pay

sleep 5

mine 1

echo ; echo "That's all folks!"

date
