# LNURL-Pay

## LNURL-Pay happy path

1. Service (your web app) calls createLnurlPay endpoint, receives a LNURL string
2. Service displays the corresponding QR code
3. User scans the QR code using his LNURL compatible wallet
4. User's wallet calls LNURL-pay-request, receives pay data
5. User's wallet calls LNURL-pay, receives bolt11
6. User's wallet pays to bolt11
7. LNURL app receives a Cyphernode webhook when the bolt11 is paid

## LNURL-Pay restrictions

1. If Service deleted the LNURL-Pay, LNURL-pay-request will fail
2. User has the responsability to have a LNURL-compatible and well-connected LN Wallet

## LNURL-Pay API endpoints

### createLnurlPay

Create a LNURL-Pay address.  The `externalId` argument will be used as the alias.

Request:

```TypeScript
{
  externalId: string;
  minMsatoshi: number;
  maxMsatoshi: number;
  description: string;
  webhookUrl?: string;
}
```

Response:

```TypeScript
{
  result?: {
    lnurlPayId: number;
    externalId: string;
    minMsatoshi: number;
    maxMsatoshi: number;
    description: string;
    webhookUrl: string | null;
    lnurl: string;
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

Example:

Request:

```json
{
  "id":0,
  "method":"createLnurlPay",
  "params":{
    "externalId":"kex002",
    "minMsatoshi":200000,
    "maxMsatoshi":2000000000,
    "description":"kex002LNURLPAY",
    "webhookUrl":"http://tests-lnurl-pay-cb:1111/lnurl/paid-kex002"
  }
}
```

Response:

```json
{
  "id":0,
  "result":{
    "lnurlPayId":2,
    "externalId":"kex002",
    "minMsatoshi":200000,
    "maxMsatoshi":2000000000,
    "description":"kex002LNURLPAY",
    "webhookUrl":"http://tests-lnurl-pay-cb:1111/lnurl/paid-kex002",
    "lnurl":"LNURL1DP68GURN8GHJ7ARJV9JKV6TT9AKXUATJDSHHQCTE9A4K27PSXQEQLMG4YP",
    "deleted":false,
    "createdTs":"2023-03-01T22:22:56.635Z",
    "updatedTs":"2023-03-01T22:22:56.635Z",
    "lnurlDecoded":"https://traefik/lnurl/pay/kex002"
  }
}
```


### getLnurlPay

Request:

```TypeScript
{
  lnurlPayId: number;
}
```

Response:

```TypeScript
{
  result?: {
    lnurlPayId: number;
    externalId: string;
    minMsatoshi: number;
    maxMsatoshi: number;
    description: string;
    webhookUrl: string | null;
    lnurl: string;
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

Example:

Request:

```json
{
  "id":0,
  "method":"getLnurlPay",
  "params":{
    "lnurlPayId":2,
  }
}
```

Response:

```json
{
  "id":0,
  "result":{
    "lnurlPayId":2,
    "externalId":"kex002",
    "minMsatoshi":200000,
    "maxMsatoshi":2000000000,
    "description":"kex002LNURLPAY",
    "webhookUrl":"http://tests-lnurl-pay-cb:1111/lnurl/paid-kex002",
    "lnurl":"LNURL1DP68GURN8GHJ7ARJV9JKV6TT9AKXUATJDSHHQCTE9A4K27PSXQEQLMG4YP",
    "deleted":false,
    "createdTs":"2023-03-01T22:22:56.635Z",
    "updatedTs":"2023-03-01T22:22:56.635Z",
    "lnurlDecoded":"https://traefik/lnurl/pay/kex002"
  }
}
```

### deleteLnurlPay

Request:

```TypeScript
{
  lnurlPayId: number;
}
```

Response:

```TypeScript
{
  result?: {
    lnurlPayId: number;
    externalId: string;
    minMsatoshi: number;
    maxMsatoshi: number;
    description: string;
    webhookUrl: string | null;
    lnurl: string;
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

## LNURL-pay User/Wallet endpoints

### /paySpecs/:externalId

Response:

```TypeScript
{
  callback?: string;
  maxSendable?: number;
  minSendable?: number;
  metadata?: string;
  tag?: string;
  status?: string;
  reason?: string;
}
```

### /payRequest/:externalId?amount=[msatoshi]

Response:

```TypeScript
{
  pr?: string;
  routes?: [];
  status?: string;
  reason?: string;
}
```

## LNURL-pay webhooks

- Payment sent to a LNURL Pay address

```json
{
  "lnurlPayRequestId": 7,
  "lnurlPayEntityId": 2,
  "bolt11Label": "2-1677730727795",
  "msatoshi": 30000000,
  "bolt11": "lnbcrt300u1pjqqgagsp54gymkgvtasfh5vh784kvaswctwtdzdykjz673zxvzyppsjecyvmspp5nqjearzvzhs9ljen5m7tr3utes5puqkzjjn3trsgtthskryeahxqhp5wg3g2ypfrmyy5wmy3q4cjhm4aq4scfsz36wldq98e3e57q22x4esxqyjw5qcqp29qyysgqr5n7kc5waj2pc5z4g20tw9ccy2g99dnrdpmgmdw93v3ejnmyysvpeuk58z6p46kjn89yqcxekj4jkrhh44fxjl6vy02k5p0mk4n2pgqpjhv3re",
  "metadata": "[[\"text/plain\",\"kex002LNURLPAY\"]]",
  "paid": true,
  "paidCalledbackTs": null,
  "deleted": false,
  "createdTs": "2023-03-02T04:18:48.343Z",
  "updatedTs": "2023-03-02T04:18:48.343Z"
}
```
