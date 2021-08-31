# LNURL Cypherapp

LNURL cypherapp for cyphernode

## LNURL-withdraw happy path

1. Service (your web app) calls createLnurlWithdraw endpoint, receives a LNURL string
2. Service displays the corresponding QR code
3. User scans the QR code using his LNURL compatible wallet
4. User's wallet calls LNURL-withdraw-request, receives withdraw data
5. User's wallet calls LNURL-withdraw, receives payment status
6. LNURL app uses Cyphernode's ln_pay to send LN payment to user

## LNURL-withdraw restrictions

1. If there's an expiration on the LNURL-withdraw, withdraw will fail after the expiration
2. If Service deleted the LNURL, withdraw will fail
3. If there's a fallback Bitcoin address on the LNURL, when expired, LNURL app will send amount on-chain
4. If batching is activated on fallback, the fallback will be sent to the Batcher

## LNURL-withdraw API endpoints

### createLnurlWithdraw

Request:

```TypeScript
{
  externalId?: string;
  msatoshi: number;
  description?: string;
  expiration?: Date;
  webhookUrl?: string;
  btcFallbackAddress?: string;
  batchFallback?: boolean;
}
```

Response:

```TypeScript
{
  result?: {
    lnurlWithdrawId: number;
    externalId: string | null;
    msatoshi: number;
    description: string | null;
    expiration: Date | null;
    secretToken: string;
    webhookUrl: string | null;
    calledback: boolean;
    calledbackTs: Date | null;
    lnurl: string;
    bolt11: string | null;
    btcFallbackAddress: string | null;
    batchFallback: boolean;
    batchRequestId: number | null;
    fallbackDone: boolean;
    withdrawnDetails: string | null;
    withdrawnTs: Date | null;
    paid: boolean;
    deleted: boolean;
    createdTs: Date;
    updatedTs: Date;
    lnurlDecoded: string;
  },
  error?: {
    code: number;
    message: string;
    data?: D;
  }
}
```

### getLnurlWithdraw

Request:

```TypeScript
{
  lnurlWithdrawId: number;
}
```

Response:

```TypeScript
{
  result?: {
    lnurlWithdrawId: number;
    externalId: string | null;
    msatoshi: number;
    description: string | null;
    expiration: Date | null;
    secretToken: string;
    webhookUrl: string | null;
    calledback: boolean;
    calledbackTs: Date | null;
    lnurl: string;
    bolt11: string | null;
    btcFallbackAddress: string | null;
    batchFallback: boolean;
    batchRequestId: number | null;
    fallbackDone: boolean;
    withdrawnDetails: string | null;
    withdrawnTs: Date | null;
    paid: boolean;
    deleted: boolean;
    createdTs: Date;
    updatedTs: Date;
    lnurlDecoded: string;
  },
  error?: {
    code: number;
    message: string;
    data?: D;
  }
}
```

### deleteLnurlWithdraw

Request:

```TypeScript
{
  lnurlWithdrawId: number;
}
```

Response:

```TypeScript
{
  result?: {
    lnurlWithdrawId: number;
    externalId: string | null;
    msatoshi: number;
    description: string | null;
    expiration: Date | null;
    secretToken: string;
    webhookUrl: string | null;
    calledback: boolean;
    calledbackTs: Date | null;
    lnurl: string;
    bolt11: string | null;
    btcFallbackAddress: string | null;
    batchFallback: boolean;
    batchRequestId: number | null;
    fallbackDone: boolean;
    withdrawnDetails: string | null;
    withdrawnTs: Date | null;
    paid: boolean;
    deleted: boolean;
    createdTs: Date;
    updatedTs: Date;
    lnurlDecoded: string;
  },
  error?: {
    code: number;
    message: string;
    data?: D;
  }
}
```

### reloadConfig, getConfig

Request: N/A

Response:

```TypeScript
{
  result?: {
    LOG: string;
    BASE_DIR: string;
    DATA_DIR: string;
    DB_NAME: string;
    URL_API_SERVER: string;
    URL_API_PORT: number;
    URL_API_CTX: string;
    URL_CTX_WEBHOOKS: string;
    SESSION_TIMEOUT: number;
    CN_URL: string;
    CN_API_ID: string;
    CN_API_KEY: string;
    BATCHER_URL: string;
    LN_SERVICE_SERVER: string;
    LN_SERVICE_PORT: number;
    LN_SERVICE_CTX: string;
    LN_SERVICE_WITHDRAW_REQUEST_CTX: string;
    LN_SERVICE_WITHDRAW_CTX: string;
    RETRY_WEBHOOKS_TIMEOUT: number;
    CHECK_EXPIRATION_TIMEOUT: number;
  },
  error?: {
    code: number;
    message: string;
    data?: D;
  }
}
```

## LNURL-withdraw User/Wallet endpoints

### /withdrawRequest?s=[secretToken]

Response:

```TypeScript
{
  status?: string;
  reason?: string;
  tag?: string;
  callback?: string;
  k1?: string;
  defaultDescription?: string;
  minWithdrawable?: number;
  maxWithdrawable?: number;
  balanceCheck?: string;
}
```

### /withdraw?k1=[secretToken]&pr=[bolt11]

Response:

```TypeScript
{
  status?: string;
  reason?: string;
}
```

## LNURL-withdraw webhooks

- LNURL Withdrawn using LN

```json
{
  "lnurlWithdrawId": 1,
  "bolt11": "lnbcrt5019590p1psjuc7upp5vzp443fueactllywqp9cm66ewreka2gt37t6su2tcq73hj363cmsdqdv3jhxce38y6njxqyjw5qcqp2sp5cextwkrkepuacr2san20epkgfqfxjukaffd806dgz8z2txrm730s9qy9qsqzuw2a2gempuz78sxa06djguslx0xs8p54656e0m2p82yzzr40rthqkxkpzxk7jhce6lz5m6eyre4jnraz3kfpyd69280qy8k4a6hwrsqxwns9y",
  "lnPayResponse": {
    "destination": "029b26c73b2c19ec9bdddeeec97c313670c96b6414ceacae0fb1b3502e490a6cbb",
    "payment_hash": "60835ac53ccf70bffc8e004b8deb5970f36ea90b8f97a8714bc03d1bca3a8e37",
    "created_at": 1630430175.298,
    "parts": 1,
    "msatoshi": 501959,
    "amount_msat": "501959msat",
    "msatoshi_sent": 501959,
    "amount_sent_msat": "501959msat",
    "payment_preimage": "337ce72718d3523de121276ef65176d2620959704e442756e81069c34213671f",
    "status": "complete"
  }
}
```

- LNURL Withdraw paid using Bitcoin fallback

```json
{
  "lnurlWithdrawId": 6,
  "btcFallbackAddress": "bcrt1q8hthhmdf9d7v2zrgpdf5ywt3crl25875em649d",
  "details": {
    "status": "accepted",
    "txid": "12a3f45dbec7ddc9f809560560e64bcca40117b1cbba2d6eb9d40b4663066016",
    "hash": "9e66b684872fd628974235156e08f189a7de7eb1c084e8022775def0faf059a9",
    "details": {
      "address": "bcrt1q8hthhmdf9d7v2zrgpdf5ywt3crl25875em649d",
      "amount": 5.1e-06,
      "firstseen": 1630430188,
      "size": 222,
      "vsize": 141,
      "replaceable": true,
      "fee": 2.82e-05,
      "subtractfeefromamount": null
    }
  }
}
```

- LNURL Withdraw paid using a batched Bitcoin fallback

```json
{
  "lnurlWithdrawId": 7,
  "btcFallbackAddress": "bcrt1qm2qs6a20k6cv6c8azvu75xsccea65ak65fu3z2",
  "details": {
    "batchRequestId": 25,
    "batchId": 5,
    "cnBatcherId": 1,
    "requestCountInBatch": 1,
    "status": "accepted",
    "txid": "a1fcb30493c9bf695e7d8e226c59ec99df0a6f3739f37e8ab122010b7b8d7545",
    "hash": "85e6fad9ebcc29d5895de2b9aaa0bdb35a356254a8fa8c1e312e762af3835f6e",
    "details": {
      "firstseen": 1630430310,
      "size": 222,
      "vsize": 141,
      "replaceable": true,
      "fee": 2.82e-05,
      "address": "bcrt1qm2qs6a20k6cv6c8azvu75xsccea65ak65fu3z2",
      "amount": 5.11e-06
    }
  }
}
```

=========================

## Temp dev notes

```bash
DOCKER_BUILDKIT=0 docker build -t lnurl .
docker run --rm -it -v "$PWD:/lnurl" --entrypoint ash bff4412e444c
npm install

docker run --rm -it --name lnurl -v "$PWD:/lnurl" -v "$PWD/cypherapps/data:/lnurl/data" -v "$PWD/cypherapps/data/logs:/lnurl/logs" --entrypoint ash lnurl
npm run build
npm run start

--

docker exec -it lnurl ash
/lnurl # apk add curl
/lnurl # curl -d '{"id":0,"method":"getConfig","params":[]}' -H "Content-Type: application/json" localhost:8000/api
{"id":0,"result":{"LOG":"DEBUG","BASE_DIR":"/lnurl","DATA_DIR":"data","DB_NAME":"lnurl.sqlite","URL_SERVER":"http://lnurl","URL_PORT":8000,"URL_CTX_WEBHOOKS":"webhooks","SESSION_TIMEOUT":600,"CN_URL":"https://gatekeeper:2009/v0","CN_API_ID":"003","CN_API_KEY":"39b83c35972aeb81a242bfe189dc0a22da5ac6cbb64072b492f2d46519a97618"}}

--

sqlite3 data/lnurl.sqlite -header "select * from lnurl_withdraw"

curl -d '{"id":0,"method":"createLnurlWithdraw","params":{"msatoshi":0.01,"description":"desc02","expiration":"2021-07-15T12:12:23.112Z","secretToken":"abc02","webhookUrl":"https://webhookUrl01"}}' -H "Content-Type: application/json" localhost:8000/api
{"id":0,"result":{"msatoshi":0.01,"description":"desc01","expiration":"2021-07-15T12:12:23.112Z","secretToken":"abc01","webhookUrl":"https://webhookUrl01","lnurl":"LNURL1DP68GUP69UHJUMMWD9HKUW3CXQHKCMN4WFKZ7AMFW35XGUNPWAFX2UT4V4EHG0MN84SKYCESXYH8P25K","withdrawnDetails":null,"withdrawnTimestamp":null,"active":1,"lnurlWithdrawId":1,"createdAt":"2021-07-15 19:42:06","updatedAt":"2021-07-15 19:42:06"}}

sqlite3 data/lnurl.sqlite -header "select * from lnurl_withdraw"
id|msatoshi|description|expiration|secret_token|webhook_url|lnurl|withdrawn_details|withdrawn_ts|active|created_ts|updated_ts
1|0.01|desc01|2021-07-15 12:12|abc01|https://webhookUrl01|LNURL1DP68GUP69UHJUMMWD9HKUW3CXQHKCMN4WFKZ7AMFW35XGUNPWAFX2UT4V4EHG0MN84SKYCESXYH8P25K|||1|2021-07-15 19:42:06|2021-07-15 19:42:06

curl -d '{"id":0,"method":"decodeBech32","params":{"s":"LNURL1DP68GUP69UHJUMMWD9HKUW3CXQHKCMN4WFKZ7AMFW35XGUNPWAFX2UT4V4EHG0MN84SKYCESXGXE8Q93"}}' -H "Content-Type: application/json" localhost:8000/api
{"id":0,"result":"http://.onion:80/lnurl/withdrawRequest?s=abc01"}

curl localhost:8000/withdrawRequest?s=abc02
{"tag":"withdrawRequest","callback":"http://.onion:80/lnurl/withdraw","k1":"abc01","defaultDescription":"desc01","minWithdrawable":0.01,"maxWithdrawable":0.01}

curl localhost:8000/withdraw?k1=abc03\&pr=lnbcrt123456780p1ps0pf5ypp5lfskvgsdef4hpx0lndqe69ypu0rxl5msndkcnlm8v6l5p75xzd6sdq2v3jhxcesxvxqyjw5qcqp2sp5f42mrc40eh4ntmqhgxvk74m2w3q25fx9m8d9wn6d20ahtfy6ju8q9qy9qsqw4khcr86dlg66nz3ds6nhxpsw9z0ugxfkequtyf8qv7q6gdvztdhsfp36uazsz35xp37lfmt0tqsssrew0wr0htfdkhjpwdagnzvc6qp2ynxvd
{"status":"OK"}

==================

docker run --rm -it --name lnurl -v "$PWD:/lnurl" -v "$PWD/cypherapps/data:/lnurl/data" -v "$PWD/cypherapps/data/logs:/lnurl/logs" -v "/Users/kexkey/dev/cn-dev/dist/cyphernode/gatekeeper/certs/cert.pem:/lnurl/cert.pem:ro" --network cyphernodeappsnet --entrypoint ash lnurl
npm run build
npm run start

DEBUG:
docker run --rm -it --name lnurl -v "$PWD:/lnurl" -v "$PWD/cypherapps/data:/lnurl/data" -v "$PWD/cypherapps/data/logs:/lnurl/logs" -v "/Users/kexkey/dev/cn-dev/dist/cyphernode/gatekeeper/certs/cert.pem:/lnurl/cert.pem:ro" -p 9229:9229 -p 8000:8000 --network cyphernodeappsnet --entrypoint ash lnurl 

npx prisma migrate reset
npx prisma generate
npx prisma migrate dev
```
