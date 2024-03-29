#!/bin/sh

# Set the CHECK_EXPIRATION_TIMEOUT config to 1 for this test to be successful

./ln_reconnect.sh

docker run --rm -d --name lnurl_withdraw_test -v "$PWD:/tests" --network=cyphernodeappsnet alpine sh -c 'while true; do sleep 10; done'
docker network connect cyphernodenet lnurl_withdraw_test
(sleep 90 ; ./mine.sh 1 0 ; sleep 90 ; ./mine.sh 1 0) &
docker exec -it lnurl_withdraw_test /tests/lnurl_withdraw.sh
docker stop lnurl_withdraw_test
