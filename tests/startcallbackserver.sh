#!/bin/bash

date

callbackservername="lnurl_withdraw_test"
callbackserverport=${1:-"1111"}

docker run --rm -it --network cyphernodeappsnet --name ${callbackservername} alpine sh -c "nc -vlkp${callbackserverport} -e sh -c 'echo -en \"HTTP/1.1 200 OK\\\\r\\\\n\\\\r\\\\n\" ; date >&2 ; timeout 1 tee /dev/tty | cat ; echo 1>&2'"

