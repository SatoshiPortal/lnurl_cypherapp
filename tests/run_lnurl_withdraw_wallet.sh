#!/bin/bash

#./startcallbackserver.sh &

docker run --rm -it -v "$PWD:/tests" --network=cyphernodeappsnet alpine /tests/lnurl_withdraw_wallet.sh $@
