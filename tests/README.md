# Test scripts

## Setup

1. Have a Cyphernode instance setup in regtest with LN active.
2. Let's double everything LN-related:
   * Duplicate the `lightning` block in `dist/docker-compose.yaml` appending a `2` to the names (see below)
   * Copy `apps/sparkwallet` to `apps/sparkwallet2` and change `apps/sparkwallet2/docker-compose.yaml` appending a `2` to the names (see below)
3. Mine enough blocks to have regtest coins to open channels between the two LN nodes (use `ln_setup.sh`)
4. Open a channel between the two nodes (use `ln_setup.sh`)
5. If connection is lost between the two nodes (eg. after a restart of Cyphernode), reconnect the two (use `ln_reconnect.sh`)

## Changes to files for lightning2...

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

### Create a LNURL for withdraw

