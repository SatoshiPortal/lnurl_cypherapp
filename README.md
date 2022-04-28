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
5. Because LN payments can be "stuck" and may eventually be successful, we reject subsequent withdraw requests that is using different bolt11 than the first request.

## LNURL-withdraw API endpoints

### createLnurlWithdraw

Request:

```TypeScript
{
  externalId?: string;
  msatoshi: number;
  description?: string;
  expiresAt?: Date;
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
    expiresAt: Date | null;
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
    expiresAt: Date | null;
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
    expiresAt: Date | null;
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

### forceFallback

This will rewing the LNURL expiration in the past to make it elligible to fallback on next check.

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
    expiresAt: Date | null;
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
