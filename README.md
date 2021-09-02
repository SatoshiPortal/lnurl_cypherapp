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

### processCallbacks

Request: N/A

Response:

```json
{}
```

### processFallbacks

Request: N/A

Response:

```json
{}
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
  "action": "lnPaid",
  "lnurlWithdrawId": 45,
  "bolt11": "lnbcrt5048150p1psnzvkjpp5fxf3zk4yalqeh3kzxusn7hpqx4f7ya6tundmdst6nvxem6eskw3qdqdv3jhxce58qcn2xqyjw5qcqp2sp5zmddwmhrellsj5nauwvcdyvvze9hg8k7wkhes04ha49htnfuawnq9qy9qsqh6ecxxqv568javdgenr5r4mm3ut82t683pe8yexql7rrwa8l5euq7ffh329rlgzsufj5s7x4n4pj2lcq0j9kqzn7gyt9zhg847pg6csqmuxdfh",
  "lnPayResponse": {
    "destination": "029b26c73b2c19ec9bdddeeec97c313670c96b6414ceacae0fb1b3502e490a6cbb",
    "payment_hash": "4993115aa4efc19bc6c237213f5c203553e2774be4dbb6c17a9b0d9deb30b3a2",
    "created_at": 1630614227.193,
    "parts": 1,
    "msatoshi": 504815,
    "amount_msat": "504815msat",
    "msatoshi_sent": 504815,
    "amount_sent_msat": "504815msat",
    "payment_preimage": "d4ecd85e662ce1f6c6f14d134755240efd6dcb2217a0f511ca29fd694942b532",
    "status": "complete"
  }
}
```

- LNURL Withdraw paid using Bitcoin fallback

```json
{
  "action": "fallbackPaid",
  "lnurlWithdrawId": 50,
  "btcFallbackAddress": "bcrt1qgs0axulr8s2wp69n5cf805ck4xv6crelndustu",
  "details": {
    "status": "accepted",
    "txid": "5683ecabaf7b4bd1d90ee23de74655495945af41f6fc783876a841598e4041f3",
    "hash": "49ba4efa1ed7a19016b623686c34a2e287d7ca3c8f58593ce07ce08ff8a12f7c",
    "details": {
      "address": "bcrt1qgs0axulr8s2wp69n5cf805ck4xv6crelndustu",
      "amount": 5.33e-06,
      "firstseen": 1630614256,
      "size": 222,
      "vsize": 141,
      "replaceable": true,
      "fee": 2.82e-05,
      "subtractfeefromamount": null
    }
  }
}
```

- LNURL Withdraw batched using Bitcoin fallback

```json
{
  "action": "fallbackBatched",
  "lnurlWithdrawId": 51,
  "btcFallbackAddress": "bcrt1qh0cpvxan6fzjxzwhwlagrpxgca7h5qrcjq2pm9",
  "details": {
    "batchId": 16,
    "batchRequestId": 36,
    "etaSeconds": 7,
    "cnResult": {
      "batcherId": 1,
      "outputId": 155,
      "nbOutputs": 1,
      "oldest": "2021-09-02 20:25:16",
      "total": 5.26e-06
    },
    "address": "bcrt1qh0cpvxan6fzjxzwhwlagrpxgca7h5qrcjq2pm9",
    "amount": 5.26e-06
  }
}
```

- LNURL Withdraw paid using a batched Bitcoin fallback

```json
{
  "action": "fallbackPaid",
  "lnurlWithdrawId": 51,
  "btcFallbackAddress": "bcrt1qh0cpvxan6fzjxzwhwlagrpxgca7h5qrcjq2pm9",
  "details": {
    "batchRequestId": 36,
    "batchId": 16,
    "cnBatcherId": 1,
    "requestCountInBatch": 1,
    "status": "accepted",
    "txid": "a6a03ea728718bccf42f53b1b833fb405f06243d1ce3aad2e5a4522eb3ab3231",
    "hash": "8aafb505abfffa6bb91b3e1c59445091c785685b9fabd6a3188e088b4c3210f0",
    "details": {
      "firstseen": 1630614325,
      "size": 222,
      "vsize": 141,
      "replaceable": true,
      "fee": 2.82e-05,
      "address": "bcrt1qh0cpvxan6fzjxzwhwlagrpxgca7h5qrcjq2pm9",
      "amount": 5.26e-06
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
