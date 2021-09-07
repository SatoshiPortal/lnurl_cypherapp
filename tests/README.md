# Test scripts

## Setup

For these tests to be successful:

- Set the CHECK_EXPIRATION_TIMEOUT config to 1
- In the Batcher, set the CHECK_THRESHOLD_MINUTES to 1 and the BATCH_THRESHOLD_AMOUNT to 0.00000500

On the Cyphernode ecosystem side:

1. Have a Cyphernode instance setup in regtest with LN active.
2. Let's double everything LN-related:
   - Duplicate the `lightning` block in `dist/docker-compose.yaml` appending a `2` to the names (see below)
   - Copy `apps/sparkwallet` to `apps/sparkwallet2` and change `apps/sparkwallet2/docker-compose.yaml` appending a `2` to the names and different port (see below)
3. Mine enough blocks to have regtest coins to open channels between the two LN nodes (use `ln_setup.sh`)
4. Open a channel between the two nodes (use `ln_setup.sh`)
5. If connection is lost between the two nodes (eg. after a restart of Cyphernode), reconnect the two (use `ln_reconnect.sh`)

## Changes to files for lightning2

dist/docker-compose.yaml:

```yaml
  lightning2:
    image: cyphernode/clightning:v0.10.0
    command: $USER /.lightning/bitcoin/entrypoint.sh
    volumes:
      - "/yourCyphernodePath/dist/cyphernode/lightning2:/.lightning"
      - "/yourCyphernodePath/dist/cyphernode/bitcoin/bitcoin-client.conf:/.bitcoin/bitcoin.conf:ro"
      - container_monitor:/container_monitor
    healthcheck:
      test: chown $USER /container_monitor && su-exec $USER sh -c 'lightning-cli getinfo && touch /container_monitor/lightning_ready && chown $USER /container_monitor/lightning_ready || rm -f /container_monitor/lightning_ready'
      interval: 20s
      timeout: 10s
      retries: 10
    stop_grace_period: 30s
    networks:
      - cyphernodenet
    depends_on:
      - tor
    deploy:
      replicas: 1
      placement:
        constraints:
          - node.labels.io.cyphernode == true
      restart_policy:
        condition: "any"
        delay: 1s
      update_config:
        parallelism: 1
```

dist/apps/sparkwallet2/docker-compose.yaml:

```yaml
  cyphernode_sparkwallet2:
    command: --no-tls ${TOR_PARAMS}
    image: cyphernode/sparkwallet:v0.2.17
    environment:
      - "NETWORK=${NETWORK}"
    volumes:
      - "/yourCyphernodePath/dist/cyphernode/lightning2:/etc/lightning"
      - "$APP_SCRIPT_PATH/cookie:/data/spark/cookie"
      - "$GATEKEEPER_DATAPATH/htpasswd:/htpasswd/htpasswd"
    labels:
      - "traefik.docker.network=cyphernodeappsnet"
      - "traefik.frontend.entryPoints=https"
      - "traefik.frontend.redirect.regex=^(.*)/sparkwallet2$$"
      - "traefik.frontend.redirect.replacement=$$1/sparkwallet2/"
      - "traefik.frontend.rule=PathPrefix:/sparkwallet2;ReplacePathRegex: ^/sparkwallet2/(.*) /$$1"
      - "traefik.frontend.passHostHeader=true"
      - "traefik.frontend.auth.basic.usersFile=/htpasswd/htpasswd"
      - "traefik.frontend.headers.customRequestHeaders=X-Access:FoeDdQw5yl7pPfqdlGy3OEk/txGqyJjSbVtffhzs7kc="
      - "traefik.enable=true"
      - "traefik.port=9737"
    networks:
      - cyphernodeappsnet
    restart: always
    deploy:
      labels:
        - "traefik.docker.network=cyphernodeappsnet"
        - "traefik.frontend.entryPoints=https"
        - "traefik.frontend.redirect.regex=^(.*)/sparkwallet2$$"
        - "traefik.frontend.redirect.replacement=$$1/sparkwallet2/"
        - "traefik.frontend.rule=PathPrefix:/sparkwallet2;ReplacePathRegex: ^/sparkwallet2/(.*) /$$1"
        - "traefik.frontend.passHostHeader=true"
        - "traefik.frontend.auth.basic.usersFile=/htpasswd/htpasswd"
        - "traefik.frontend.headers.customRequestHeaders=X-Access:FoeDdQw5yl7pPfqdlGy3OEk/txGqyJjSbVtffhzs7kc="
        - "traefik.enable=true"
        - "traefik.port=9737"
      replicas: 1
      placement:
        constraints:
          - node.labels.io.cyphernode == true
      restart_policy:
        condition: "any"
        delay: 1s
      update_config:
        parallelism: 1
```

## Test LNURL-withdraw

Container `lightning` is used by Cyphernode and `lightning2` will be our user.

Run ./run_tests.sh or

```bash
docker run --rm -it -v "$PWD:/tests" --network=cyphernodeappsnet alpine /tests/lnurl_withdraw.sh
```

lnurl_withdraw.sh will simulate real-world use cases:

### Happy path

1. Create a LNURL Withdraw
2. Get it and compare
3. User calls LNServiceWithdrawRequest with wrong k1 -> Error, wrong k1!
4. User calls LNServiceWithdrawRequest
5. User calls LNServiceWithdraw with wrong k1 -> Error, wrong k1!
6. User calls LNServiceWithdraw

### Expired 1

1. Create a LNURL Withdraw with expiration=now
2. Get it and compare
3. User calls LNServiceWithdrawRequest -> Error, expired!

### Expired 2

1. Create a LNURL Withdraw with expiration=now + 5 seconds
2. Get it and compare
3. User calls LNServiceWithdrawRequest
4. Sleep 5 seconds
5. User calls LNServiceWithdraw -> Error, expired!

### Deleted 1

1. Create a LNURL Withdraw with expiration=now
2. Get it and compare
3. Delete it
4. Get it and compare
5. User calls LNServiceWithdrawRequest -> Error, deleted!

### Deleted 2

1. Create a LNURL Withdraw with expiration=now + 5 seconds
2. Get it and compare
3. User calls LNServiceWithdrawRequest
4. Delete it
5. User calls LNServiceWithdraw -> Error, deleted!

### fallback 1, use of Bitcoin fallback address

1. Cyphernode.getnewaddress -> btcfallbackaddr
2. Cyphernode.watch btcfallbackaddr
3. Listen to watch webhook
4. Create a LNURL Withdraw with expiration=now and a btcfallbackaddr
5. Get it and compare
6. User calls LNServiceWithdrawRequest -> Error, expired!
7. Fallback should be triggered, LNURL callback called (port 1111), Cyphernode's watch callback called (port 1112)
8. Mined block and Cyphernode's confirmed watch callback called (port 1113)

### fallback 2, use of Bitcoin fallback address in a batched spend

1. Cyphernode.getnewaddress -> btcfallbackaddr
2. Cyphernode.watch btcfallbackaddr
3. Listen to watch webhook
4. Create a LNURL Withdraw with expiration=now and a btcfallbackaddr
5. Get it and compare
6. User calls LNServiceWithdrawRequest -> Error, expired!
7. Fallback should be triggered, added to current batch using the Batcher
8. Wait for the batch to execute, LNURL callback called (port 1111), Cyphernode's watch callback called (port 1112), Batcher's execute callback called (port 1113)
9. Mined block and Cyphernode's confirmed watch callback called (port 1114)
