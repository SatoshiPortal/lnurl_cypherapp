import logger from "./Log2File";
import crypto from "crypto";
import axios, { AxiosError, AxiosRequestConfig } from "axios";
import https from "https";
import path from "path";
import fs from "fs";
import LnurlConfig from "../config/LnurlConfig";
import IRespGetBatchDetails from "../types/cyphernode/IRespGetBatchDetails";
import IRespAddToBatch from "../types/cyphernode/IRespAddToBatch";
import IReqBatchSpend from "../types/cyphernode/IReqBatchSpend";
import IReqGetBatchDetails from "../types/cyphernode/IReqGetBatchDetails";
import IRespBatchSpend from "../types/cyphernode/IRespBatchSpend";
import IReqAddToBatch from "../types/cyphernode/IReqAddToBatch";
import { IResponseError, ErrorCodes } from "../types/jsonrpc/IResponseMessage";
import IReqSpend from "../types/cyphernode/IReqSpend";
import IRespSpend from "../types/cyphernode/IRespSpend";
import IReqLnPay from "../types/cyphernode/IReqLnPay";
import IRespLnPay from "../types/cyphernode/IRespLnPay";
import IRespLnListPays from "../types/cyphernode/IRespLnListPays";
import IReqLnListPays from "../types/cyphernode/IReqLnListPays";
import IRespLnPayStatus from "../types/cyphernode/IRespLnPayStatus";

class CyphernodeClient {
  private baseURL: string;
  // echo -n '{"alg":"HS256","typ":"JWT"}' | basenc --base64url | tr -d '='
  private readonly h64: string = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9";
  private apiId: string;
  private apiKey: string;
  private caFile: string;

  constructor(lnurlConfig: LnurlConfig) {
    this.baseURL = lnurlConfig.CN_URL;
    this.apiId = lnurlConfig.CN_API_ID;
    this.apiKey = lnurlConfig.CN_API_KEY;
    this.caFile = path.resolve(lnurlConfig.BASE_DIR, "cert.pem");
  }

  configureCyphernode(lnurlConfig: LnurlConfig): void {
    this.baseURL = lnurlConfig.CN_URL;
    this.apiId = lnurlConfig.CN_API_ID;
    this.apiKey = lnurlConfig.CN_API_KEY;
    this.caFile = path.resolve(lnurlConfig.BASE_DIR, "cert.pem");
  }

  _generateToken(): string {
    logger.info("CyphernodeClient._generateToken");

    const current = Math.round(new Date().getTime() / 1000) + 10;
    const p = '{"id":"' + this.apiId + '","exp":' + current + "}";
    const re1 = /\+/g;
    const re2 = /\//g;
    const p64 = Buffer.from(p)
      .toString("base64")
      .replace(re1, "-")
      .replace(re2, "_")
      .split("=")[0];
    const msg = this.h64 + "." + p64;
    const s = crypto
      .createHmac("sha256", this.apiKey)
      .update(msg)
      .digest("base64")
      .replace(re1, "-")
      .replace(re2, "_")
      .split("=")[0];
    const token = msg + "." + s;

    logger.debug("CyphernodeClient._generateToken :: token=" + token);

    return token;
  }

  async _post(
    url: string,
    postdata: unknown,
    addedOptions?: unknown
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ): Promise<any> {
    logger.info("CyphernodeClient._post:", url, postdata, addedOptions);

    let configs: AxiosRequestConfig = {
      url: url,
      method: "post",
      baseURL: this.baseURL,
      timeout: 60000,
      headers: {
        Authorization: "Bearer " + this._generateToken(),
      },
      data: postdata,
      httpsAgent: new https.Agent({
        ca: fs.readFileSync(this.caFile),
        // rejectUnauthorized: false,
      }),
    };
    if (addedOptions) {
      configs = Object.assign(configs, addedOptions);
    }

    // logger.debug(
    //   "CyphernodeClient._post :: configs: %s",
    //   JSON.stringify(configs)
    // );

    try {
      const response = await axios.request(configs);
      logger.debug("CyphernodeClient._post :: response.data:", response.data);

      return { status: response.status, data: response.data };
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const error: AxiosError = err;

        if (error.response) {
          // The request was made and the server responded with a status code
          // that falls out of the range of 2xx
          logger.info(
            "CyphernodeClient._post :: error.response.data:",
            error.response.data
          );
          logger.info(
            "CyphernodeClient._post :: error.response.status:",
            error.response.status
          );
          logger.info(
            "CyphernodeClient._post :: error.response.headers:",
            error.response.headers
          );

          return { status: error.response.status, data: error.response.data };
        } else if (error.request) {
          // The request was made but no response was received
          // `error.request` is an instance of XMLHttpRequest in the browser and an instance of
          // http.ClientRequest in node.js
          logger.info(
            "CyphernodeClient._post :: error.message:",
            error.message
          );

          return { status: -1, data: error.message };
        } else {
          // Something happened in setting up the request that triggered an Error
          logger.info("CyphernodeClient._post :: Error:", error.message);

          return { status: -2, data: error.message };
        }
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return { status: -2, data: (err as any).message };
      }
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async _get(url: string, addedOptions?: unknown): Promise<any> {
    logger.info("CyphernodeClient._get:", url, addedOptions);

    let configs: AxiosRequestConfig = {
      url: url,
      method: "get",
      baseURL: this.baseURL,
      timeout: 30000,
      headers: {
        Authorization: "Bearer " + this._generateToken(),
      },
      httpsAgent: new https.Agent({
        ca: fs.readFileSync(this.caFile),
        // rejectUnauthorized: false,
      }),
    };
    if (addedOptions) {
      configs = Object.assign(configs, addedOptions);
    }

    try {
      const response = await axios.request(configs);
      logger.debug("CyphernodeClient._get :: response.data:", response.data);

      return { status: response.status, data: response.data };
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const error: AxiosError = err;

        if (error.response) {
          // The request was made and the server responded with a status code
          // that falls out of the range of 2xx
          logger.info(
            "CyphernodeClient._get :: error.response.data:",
            error.response.data
          );
          logger.info(
            "CyphernodeClient._get :: error.response.status:",
            error.response.status
          );
          logger.info(
            "CyphernodeClient._get :: error.response.headers:",
            error.response.headers
          );

          return { status: error.response.status, data: error.response.data };
        } else if (error.request) {
          // The request was made but no response was received
          // `error.request` is an instance of XMLHttpRequest in the browser and an instance of
          // http.ClientRequest in node.js
          logger.info("CyphernodeClient._get :: error.message:", error.message);

          return { status: -1, data: error.message };
        } else {
          // Something happened in setting up the request that triggered an Error
          logger.info("CyphernodeClient._get :: Error:", error.message);

          return { status: -2, data: error.message };
        }
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return { status: -2, data: (err as any).message };
      }
    }
  }

  async addToBatch(batchRequestTO: IReqAddToBatch): Promise<IRespAddToBatch> {
    // POST http://192.168.111.152:8080/addtobatch

    // args:
    // - address, required, desination address
    // - amount, required, amount to send to the destination address
    // - batchId, optional, the id of the batch to which the output will be added, default batch if not supplied, overrides batchLabel
    // - batchLabel, optional, the label of the batch to which the output will be added, default batch if not supplied
    // - webhookUrl, optional, the webhook to call when the batch is broadcast

    // response:
    // - batcherId, the id of the batcher
    // - outputId, the id of the added output
    // - nbOutputs, the number of outputs currently in the batch
    // - oldest, the timestamp of the oldest output in the batch
    // - total, the current sum of the batch's output amounts

    // BODY {"address":"2N8DcqzfkYi8CkYzvNNS5amoq3SbAcQNXKp","amount":0.00233}
    // BODY {"address":"2N8DcqzfkYi8CkYzvNNS5amoq3SbAcQNXKp","amount":0.00233,"batchId":34,"webhookUrl":"https://myCypherApp:3000/batchExecuted"}
    // BODY {"address":"2N8DcqzfkYi8CkYzvNNS5amoq3SbAcQNXKp","amount":0.00233,"batchLabel":"lowfees","webhookUrl":"https://myCypherApp:3000/batchExecuted"}
    // BODY {"address":"2N8DcqzfkYi8CkYzvNNS5amoq3SbAcQNXKp","amount":0.00233,"batchId":34,"webhookUrl":"https://myCypherApp:3000/batchExecuted"}

    logger.info("CyphernodeClient.addToBatch:", batchRequestTO);

    let result: IRespAddToBatch;
    const response = await this._post("/addtobatch", batchRequestTO);

    if (response.status >= 200 && response.status < 400) {
      result = { result: response.data.result };
    } else {
      result = {
        error: {
          code: response.data.error.code,
          message: response.data.error.message,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as IResponseError<any>,
      } as IRespBatchSpend;
    }
    return result;
  }

  async removeFromBatch(outputId: number): Promise<IRespAddToBatch> {
    // POST http://192.168.111.152:8080/removefrombatch
    //
    // args:
    // - outputId, required, id of the output to remove
    //
    // response:
    // - batcherId, the id of the batcher
    // - outputId, the id of the removed output if found
    // - nbOutputs, the number of outputs currently in the batch
    // - oldest, the timestamp of the oldest output in the batch
    // - total, the current sum of the batch's output amounts
    //
    // BODY {"id":72}

    logger.info("CyphernodeClient.removeFromBatch:", outputId);

    let result: IRespAddToBatch;
    const response = await this._post("/removefrombatch", {
      outputId,
    });

    if (response.status >= 200 && response.status < 400) {
      result = { result: response.data.result };
    } else {
      result = {
        error: {
          code: response.data.error.code,
          message: response.data.error.message,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as IResponseError<any>,
      } as IRespBatchSpend;
    }
    return result;
  }

  async getBatchDetails(
    batchIdent: IReqGetBatchDetails
  ): Promise<IRespGetBatchDetails> {
    // POST (GET) http://192.168.111.152:8080/getbatchdetails
    //
    // args:
    // - batcherId, optional, id of the batcher, overrides batcherLabel, default batcher will be spent if not supplied
    // - batcherLabel, optional, label of the batcher, default batcher will be used if not supplied
    // - txid, optional, if you want the details of an executed batch, supply the batch txid, will return current pending batch
    //     if not supplied
    //
    // response:
    // {"result":{
    //    "batcherId":34,
    //    "batcherLabel":"Special batcher for a special client",
    //    "confTarget":6,
    //    "nbOutputs":83,
    //    "oldest":123123,
    //    "total":10.86990143,
    //    "txid":"af867c86000da76df7ddb1054b273ca9e034e8c89d049b5b2795f9f590f67648",
    //    "hash":"af867c86000da76df7ddb1054b273ca9e034e8c89d049b5b2795f9f590f67648",
    //    "details":{
    //      "firstseen":123123,
    //      "size":424,
    //      "vsize":371,
    //      "replaceable":true,
    //      "fee":0.00004112
    //    },
    //    "outputs":[
    //      "1abc":0.12,
    //      "3abc":0.66,
    //      "bc1abc":2.848,
    //      ...
    //    ]
    //  }
    // },"error":null}
    //
    // BODY {}
    // BODY {"batcherId":34}

    logger.info("CyphernodeClient.getBatchDetails:", batchIdent);

    let result: IRespGetBatchDetails;
    const response = await this._post("/getbatchdetails", batchIdent);

    if (response.status >= 200 && response.status < 400) {
      result = { result: response.data.result };
    } else {
      result = {
        error: {
          code: response.data.error.code,
          message: response.data.error.message,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as IResponseError<any>,
      } as IRespBatchSpend;
    }
    return result;
  }

  async batchSpend(batchSpendTO: IReqBatchSpend): Promise<IRespBatchSpend> {
    // POST http://192.168.111.152:8080/batchspend
    //
    // args:
    // - batcherId, optional, id of the batcher to execute, overrides batcherLabel, default batcher will be spent if not supplied
    // - batcherLabel, optional, label of the batcher to execute, default batcher will be executed if not supplied
    // - confTarget, optional, overrides default value of createbatcher, default to value of createbatcher, default Bitcoin Core conf_target will be used if not supplied
    // NOTYET - feeRate, optional, overrides confTarget if supplied, overrides default value of createbatcher, default to value of createbatcher, default Bitcoin Core value will be used if not supplied
    //
    // response:
    // - txid, the transaction txid
    // - hash, the transaction hash
    // - nbOutputs, the number of outputs spent in the batch
    // - oldest, the timestamp of the oldest output in the spent batch
    // - total, the sum of the spent batch's output amounts
    // - tx details: size, vsize, replaceable, fee
    // - outputs
    //
    // {"result":{
    //    "batcherId":34,
    //    "batcherLabel":"Special batcher for a special client",
    //    "confTarget":6,
    //    "nbOutputs":83,
    //    "oldest":123123,
    //    "total":10.86990143,
    //    "txid":"af867c86000da76df7ddb1054b273ca9e034e8c89d049b5b2795f9f590f67648",
    //    "hash":"af867c86000da76df7ddb1054b273ca9e034e8c89d049b5b2795f9f590f67648",
    //    "details":{
    //      "firstseen":123123,
    //      "size":424,
    //      "vsize":371,
    //      "replaceable":true,
    //      "fee":0.00004112
    //    },
    //    "outputs":{
    //      "1abc":0.12,
    //      "3abc":0.66,
    //      "bc1abc":2.848,
    //      ...
    //    }
    //  }
    // },"error":null}
    //
    // BODY {}
    // BODY {"batcherId":34,"confTarget":12}
    // NOTYET BODY {"batcherLabel":"highfees","feeRate":233.7}
    // BODY {"batcherId":411,"confTarget":6}

    logger.info("CyphernodeClient.batchSpend:", batchSpendTO);

    let result: IRespBatchSpend;
    const response = await this._post("/batchspend", batchSpendTO);
    if (response.status >= 200 && response.status < 400) {
      result = { result: response.data.result };
    } else {
      result = {
        error: {
          code: response.data.error.code,
          message: response.data.error.message,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as IResponseError<any>,
      } as IRespBatchSpend;
    }
    return result;
  }

  async spend(spendTO: IReqSpend): Promise<IRespSpend> {
    // POST http://192.168.111.152:8080/spend
    // BODY {"address":"2N8DcqzfkYi8CkYzvNNS5amoq3SbAcQNXKp","amount":0.00233,"confTarget":6,"replaceable":true,"subtractfeefromamount":false}

    // args:
    // - address, required, desination address
    // - amount, required, amount to send to the destination address
    // - confTarget, optional, overrides default value, default Bitcoin Core conf_target will be used if not supplied
    // - replaceable, optional, overrides default value, default Bitcoin Core walletrbf will be used if not supplied
    // - subtractfeefromamount, optional, if true will subtract fee from the amount sent instead of adding to it
    //
    // response:
    // - txid, the transaction txid
    // - hash, the transaction hash
    // - tx details: address, aount, firstseen, size, vsize, replaceable, fee, subtractfeefromamount
    //
    // {"result":{
    //    "status":"accepted",
    //    "txid":"af867c86000da76df7ddb1054b273ca9e034e8c89d049b5b2795f9f590f67648",
    //    "hash":"af867c86000da76df7ddb1054b273ca9e034e8c89d049b5b2795f9f590f67648",
    //    "details":{
    //      "address":"2N8DcqzfkYi8CkYzvNNS5amoq3SbAcQNXKp",
    //      "amount":0.00233,
    //      "firstseen":123123,
    //      "size":424,
    //      "vsize":371,
    //      "replaceable":true,
    //      "fee":0.00004112,
    //      "subtractfeefromamount":true
    //    }
    //  }
    // },"error":null}
    //
    // BODY {"address":"2N8DcqzfkYi8CkYzvNNS5amoq3SbAcQNXKp","amount":0.00233}

    logger.info("CyphernodeClient.spend:", spendTO);

    let result: IRespSpend;
    const response = await this._post("/spend", spendTO);
    if (response.status >= 200 && response.status < 400) {
      result = { result: response.data };
    } else {
      result = {
        error: {
          code: ErrorCodes.InternalError,
          message: response.data.message,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as IResponseError<any>,
      } as IRespSpend;
    }
    return result;
  }

  async lnPay(lnPayTO: IReqLnPay): Promise<IRespLnPay> {
    // POST http://192.168.111.152:8080/ln_pay
    // BODY {"bolt11":"lntb1pdca82tpp5g[...]9wafq9n4w28amnmwzujgqpmapcr3",
    // "expected_msatoshi":"10000","expected_description":"Bitcoin Outlet order #7082"}

    // args:
    // - bolt11, required, lightning network bolt11 invoice
    // - expected_msatoshi, optional, amount we want to send, expected to be the same amount as the one encoded in the bolt11 invoice
    // - expected_description, optional, expected description encoded in the bolt11 invoice
    //
    //  Example of error result:
    //
    //  { "code" : 204, "message" : "failed: WIRE_TEMPORARY_CHANNEL_FAILURE (Outgoing subdaemon died)", "data" :
    //  {
    //    "erring_index": 0,
    //    "failcode": 4103,
    //    "erring_node": "031b867d9d6631a1352cc0f37bcea94bd5587a8d4f40416c4ce1a12511b1e68f56",
    //    "erring_channel": "1452982:62:0"
    //  } }
    //
    //
    //  Example of successful result:
    //
    //  {
    //    "id": 44,
    //    "payment_hash": "de648062da7117903291dab2075881e49ddd78efbf82438e4a2f486a7ebe0f3a",
    //    "destination": "02be93d1dad1ccae7beea7b42f8dbcfbdafb4d342335c603125ef518200290b450",
    //    "msatoshi": 207000,
    //    "msatoshi_sent": 207747,
    //    "created_at": 1548380406,
    //    "status": "complete",
    //    "payment_preimage": "a7ef27e9a94d63e4028f35ca4213fd9008227ad86815cd40d3413287d819b145",
    //    "description": "Order 43012 - Satoshi Larrivee",
    //    "getroute_tries": 1,
    //    "sendpay_tries": 1,
    //    "route": [
    //      {
    //        "id": "02be93d1dad1ccae7beea7b42f8dbcfbdafb4d342335c603125ef518200290b450",
    //        "channel": "1452749:174:0",
    //        "msatoshi": 207747,
    //        "delay": 10
    //      }
    //    ],
    //    "failures": [
    //    ]
    //  }

    logger.info("CyphernodeClient.lnPay:", lnPayTO);

    let result: IRespLnPay;
    const response = await this._post("/ln_pay", lnPayTO);
    if (response.status >= 200 && response.status < 400) {
      result = { result: response.data };
    } else {
      result = {
        error: {
          code: ErrorCodes.InternalError,
          message: response.data.message,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as IResponseError<any>,
      } as IRespLnPay;
    }
    return result;
  }

  async lnListPays(lnListPaysTO: IReqLnListPays): Promise<IRespLnListPays> {
    // POST http://192.168.111.152:8080/ln_listpays
    // BODY {"bolt11":"lntb1pdca82tpp5g[...]9wafq9n4w28amnmwzujgqpmapcr3"}
    //
    // args:
    // - bolt11, optional, lightning network bolt11 invoice
    //
    //  Example of error result:
    //
    // {
    //   "code": -32602,
    //   "message": "Invalid invstring: invalid bech32 string"
    // }
    //
    //
    //  Example of successful result when a bolt11 is supplied:
    //
    // {
    //   "pays": [
    //     {
    //     "bolt11": "lnbcrt10m1psv5fu0pp5x239mf9m5p6grz4muzv202pdye3atrzp9nzm7nqjt5vfz4mp2vqqdqdv3ekxvfnxy6njxqzuycqp2sp5f9rhgvpy7j5l3ka2yhxazd2kf8mx4h7sjcwncfy3s7vrq7wt2v6q9qy9qsqngws5fwc56uagscw8pqwupt7hqkrj7nl60x9yv3c4gp3xl8tpd6hzp8f4rtk3k7r2c30sgwjyedtq5xxqvqnljt3ymz5thlrw367ccsparekqw",
    //     "destination": "029b26c73b2c19ec9bdddeeec97c313670c96b6414ceacae0fb1b3502e490a6cbb",
    //     "payment_hash": "32a25da4bba074818abbe098a7a82d2663d58c412cc5bf4c125d189157615300",
    //     "status": "complete",
    //     "created_at": 1623861137,
    //     "preimage": "6a2b15478bd661cac9ed03b808b3f21e27ed0a2abe392e953dfc3f801a9d1829",
    //     "amount_msat": "1000000000msat",
    //     "amount_sent_msat": "1000000000msat"
    //     }
    //   ]
    // }
    //
    //
    //  Example of successful result when a non-existing bolt11 is supplied or none supplied but empty list:
    //
    // {
    //   "pays": [
    //   ]
    // }
    //
    //
    //  Example of successful result when no bolt11 is supplied (lists all):
    //
    // {
    //   "pays": [
    //     {
    //     "bolt11": "lnbcrt174410p1ps07kf8pp500w6fzdfgzse5wf59l36ktqhtqzmzla7ypa2uagx796nlzlzm8jqdqdv3jhxcehxs6rzxqyjw5qcqp2sp5rkknr49qf3empm9shcvayvtcwuv2pkfz04yf38rxpnacnvx382ms9qy9qsqlfqvztg2hlrzu0vad5gwhmh8rnd6t2ph27shq7gm36y24mce9k6n45cq4kmexkandrg5463luw4rduj3uu4cy9qxrnmukn8g29azhaqprngzww",
    //     "destination": "029b26c73b2c19ec9bdddeeec97c313670c96b6414ceacae0fb1b3502e490a6cbb",
    //     "payment_hash": "7bdda489a940a19a39342fe3ab2c175805b17fbe207aae7506f1753f8be2d9e4",
    //     "status": "complete",
    //     "created_at": 1627347240,
    //     "preimage": "8ba5bfd92f363656633232b94c25551b236b0a4cf343503bf705a2d4951c8ac8",
    //     "amount_msat": "17441msat",
    //     "amount_sent_msat": "17441msat"
    //     },
    //     ...
    //     {
    //     "bolt11": "lnbcrt10m1psv5fu0pp5x239mf9m5p6grz4muzv202pdye3atrzp9nzm7nqjt5vfz4mp2vqqdqdv3ekxvfnxy6njxqzuycqp2sp5f9rhgvpy7j5l3ka2yhxazd2kf8mx4h7sjcwncfy3s7vrq7wt2v6q9qy9qsqngws5fwc56uagscw8pqwupt7hqkrj7nl60x9yv3c4gp3xl8tpd6hzp8f4rtk3k7r2c30sgwjyedtq5xxqvqnljt3ymz5thlrw367ccsparekqw",
    //     "destination": "029b26c73b2c19ec9bdddeeec97c313670c96b6414ceacae0fb1b3502e490a6cbb",
    //     "payment_hash": "32a25da4bba074818abbe098a7a82d2663d58c412cc5bf4c125d189157615300",
    //     "status": "complete",
    //     "created_at": 1623861137,
    //     "preimage": "6a2b15478bd661cac9ed03b808b3f21e27ed0a2abe392e953dfc3f801a9d1829",
    //     "amount_msat": "1000000000msat",
    //     "amount_sent_msat": "1000000000msat"
    //     }
    //   ]
    // }
    //

    logger.info("CyphernodeClient.lnListPays:", lnListPaysTO);

    let result: IRespLnListPays;
    const response = await this._post("/ln_listpays", lnListPaysTO);
    if (response.status >= 200 && response.status < 400) {
      result = { result: response.data };
    } else {
      result = {
        error: {
          code: ErrorCodes.InternalError,
          message: response.data.message,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as IResponseError<any>,
      } as IRespLnListPays;
    }
    return result;
  }

  async lnPayStatus(lnPayStatusTO: IReqLnListPays): Promise<IRespLnPayStatus> {
    // POST http://192.168.111.152:8080/ln_listpays
    // BODY {"bolt11":"lntb1pdca82tpp5g[...]9wafq9n4w28amnmwzujgqpmapcr3"}
    //
    // args:
    // - bolt11, optional, lightning network bolt11 invoice
    //
    //  Example of error result:
    //
    // {
    //    "pay": []
    // }
    //
    //
    //  Example of successful result when a bolt11 is supplied:
    //
    //  {
    //     "pay": [
    //        {
    //           "bolt11": "lnbcrt123450p1psn5ud2pp5q4rfk3qgxcejp30uqrakauva03e28xrjxy48cpha8ngceyk62pxqdq9vscrjxqyjw5qcqp2sp5cen5rxu72vcktz7mu3uaq84gqulcc0a5yvekmdfady8v5dr5xkjq9qyyssqs7ff458qr6atp2k8lj0t5l8n722mtv3qnetrclzep33mdp48smgrl4phqz89wq07wmhlug5ezztr2yxh8uzwpda5pzfsdtvz3d5qdvgpt56wqt",
    //           "amount_msat": "12345msat",
    //           "amount_msat": "12345msat",
    //           "destination": "029b26c73b2c19ec9bdddeeec97c313670c96b6414ceacae0fb1b3502e490a6cbb",
    //           "attempts": [
    //              {
    //                 "strategy": "Initial attempt",
    //                 "start_time": "2021-09-09T20:42:54.779Z",
    //                 "age_in_seconds": 652,
    //                 "end_time": "2021-09-09T20:42:54.826Z",
    //                 "state": "completed",
    //                 "failure": {
    //                    "code": 205,
    //                    "message": "Call to getroute: Could not find a route"
    //                 }
    //              }
    //           ]
    //        },
    //        {
    //           "bolt11": "lnbcrt123450p1psn5ud2pp5q4rfk3qgxcejp30uqrakauva03e28xrjxy48cpha8ngceyk62pxqdq9vscrjxqyjw5qcqp2sp5cen5rxu72vcktz7mu3uaq84gqulcc0a5yvekmdfady8v5dr5xkjq9qyyssqs7ff458qr6atp2k8lj0t5l8n722mtv3qnetrclzep33mdp48smgrl4phqz89wq07wmhlug5ezztr2yxh8uzwpda5pzfsdtvz3d5qdvgpt56wqt",
    //           "amount_msat": "12345msat",
    //           "amount_msat": "12345msat",
    //           "destination": "029b26c73b2c19ec9bdddeeec97c313670c96b6414ceacae0fb1b3502e490a6cbb",
    //           "attempts": [
    //              {
    //                 "strategy": "Initial attempt",
    //                 "start_time": "2021-09-09T20:53:37.384Z",
    //                 "age_in_seconds": 9,
    //                 "end_time": "2021-09-09T20:53:37.719Z",
    //                 "state": "completed",
    //                 "success": {
    //                    "id": 225,
    //                    "payment_preimage": "0fe69b61ee05fa966b612a9398057730f69459a8a7cf5a1f518203be92ce962e"
    //                 }
    //              }
    //           ]
    //        }
    //     ]
    //  }
    //
    //
    //
    //  Example of successful result when no bolt11 is supplied (lists all):
    //
    // {
    //    "pay": [
    //       {
    //          "bolt11": "lnbcrt5190610p1psn5urqpp5l5mxhx8u0wfck2ha96ke0hvqn22rlp34zkqfllysmj0m3unctsgqdq0v3jhxce38ycrvvgxqyjw5qcqp2sp5rcqxz7qpnckvjkpfacc5er8vl4s2es6ved4zqsge4zaxgkww72ls9qyyssq7yr4ulda5xl3t5hc3u7rykq64nfh7v66zehtl37cn7ehepzlg2fqwy2px5msqtpf96caqrhmtcclk6j4qu6pe5r0rayvqmw3wxcl7pgpk20fsl",
    //          "msatoshi": 519061,
    //          "amount_msat": "519061msat",
    //          "destination": "029b26c73b2c19ec9bdddeeec97c313670c96b6414ceacae0fb1b3502e490a6cbb",
    //          "local_exclusions": "Excluded channel 294x1x0/1 (3881837942msat, disconnected). ",
    //          "attempts": [
    //             {
    //                "strategy": "Initial attempt",
    //                "start_time": "2021-09-09T20:36:48.925Z",
    //                "age_in_seconds": 2968,
    //                "end_time": "2021-09-09T20:36:48.927Z",
    //                "duration_in_seconds": 0,
    //                "excluded_nodes_or_channels": [
    //                   "294x1x0/1"
    //                ],
    //                "failure": {
    //                   "code": 205,
    //                   "message": "Call to getroute: Could not find a route"
    //                }
    //             }
    //          ]
    //       },
    //       ...
    //       {
    //          "bolt11": "lnbcrt123450p1psn5ud2pp5q4rfk3qgxcejp30uqrakauva03e28xrjxy48cpha8ngceyk62pxqdq9vscrjxqyjw5qcqp2sp5cen5rxu72vcktz7mu3uaq84gqulcc0a5yvekmdfady8v5dr5xkjq9qyyssqs7ff458qr6atp2k8lj0t5l8n722mtv3qnetrclzep33mdp48smgrl4phqz89wq07wmhlug5ezztr2yxh8uzwpda5pzfsdtvz3d5qdvgpt56wqt",
    //          "amount_msat": "12345msat",
    //          "amount_msat": "12345msat",
    //          "destination": "029b26c73b2c19ec9bdddeeec97c313670c96b6414ceacae0fb1b3502e490a6cbb",
    //          "attempts": [
    //             {
    //                "strategy": "Initial attempt",
    //                "start_time": "2021-09-09T20:53:37.384Z",
    //                "age_in_seconds": 1960,
    //                "end_time": "2021-09-09T20:53:37.719Z",
    //                "state": "completed",
    //                "success": {
    //                   "id": 225,
    //                   "payment_preimage": "0fe69b61ee05fa966b612a9398057730f69459a8a7cf5a1f518203be92ce962e"
    //                }
    //             }
    //          ]
    //       }
    //    ]
    // }

    logger.info("CyphernodeClient.lnPayStatus:", lnPayStatusTO);

    let result: IRespLnPayStatus;
    const response = await this._post("/ln_paystatus", lnPayStatusTO);
    if (response.status >= 200 && response.status < 400) {
      result = { result: response.data };
    } else {
      result = {
        error: {
          code: ErrorCodes.InternalError,
          message: response.data.message,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as IResponseError<any>,
      } as IRespLnPayStatus;
    }
    return result;
  }
}

export { CyphernodeClient };
