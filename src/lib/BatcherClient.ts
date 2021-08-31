import logger from "./Log2File";
import axios, { AxiosError, AxiosRequestConfig } from "axios";
import LnurlConfig from "../config/LnurlConfig";
import { IResponseError } from "../types/jsonrpc/IResponseMessage";
import IReqBatchRequest from "../types/batcher/IReqBatchRequest";
import IRespBatchRequest from "../types/batcher/IRespBatchRequest";

class BatcherClient {
  private baseURL: string;

  constructor(lnurlConfig: LnurlConfig) {
    this.baseURL = lnurlConfig.BATCHER_URL;
  }

  configureBatcher(lnurlConfig: LnurlConfig): void {
    this.baseURL = lnurlConfig.BATCHER_URL;
  }

  async _post(
    url: string,
    postdata: unknown,
    addedOptions?: unknown
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ): Promise<any> {
    logger.info("BatcherClient._post:", url, postdata, addedOptions);

    let configs: AxiosRequestConfig = {
      url: url,
      method: "post",
      baseURL: this.baseURL,
      timeout: 30000,
      data: postdata,
    };
    if (addedOptions) {
      configs = Object.assign(configs, addedOptions);
    }

    // logger.debug(
    //   "BatcherClient._post :: configs: %s",
    //   JSON.stringify(configs)
    // );

    try {
      const response = await axios.request(configs);
      logger.debug("BatcherClient._post :: response.data:", response.data);

      return { status: response.status, data: response.data };
    } catch (err) {
      // logger.debug("BatcherClient._post, err:", err);
      if (axios.isAxiosError(err)) {
        const error: AxiosError = err;

        if (error.response) {
          // The request was made and the server responded with a status code
          // that falls out of the range of 2xx
          logger.info(
            "BatcherClient._post :: error.response.data:",
            error.response.data
          );
          logger.info(
            "BatcherClient._post :: error.response.status:",
            error.response.status
          );
          logger.info(
            "BatcherClient._post :: error.response.headers:",
            error.response.headers
          );

          return { status: error.response.status, data: error.response.data };
        } else if (error.request) {
          // The request was made but no response was received
          // `error.request` is an instance of XMLHttpRequest in the browser and an instance of
          // http.ClientRequest in node.js
          logger.info("BatcherClient._post :: error.message:", error.message);

          return {
            status: -1,
            data: { code: error.code, message: error.message },
          };
        } else {
          // Something happened in setting up the request that triggered an Error
          logger.info("BatcherClient._post :: Error:", error.message);

          return {
            status: -2,
            data: { code: error.code, message: error.message },
          };
        }
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return { status: -2, data: (err as any).message };
      }
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async _get(url: string, addedOptions?: unknown): Promise<any> {
    logger.info("BatcherClient._get:", url, addedOptions);

    let configs: AxiosRequestConfig = {
      url: url,
      method: "get",
      baseURL: this.baseURL,
      timeout: 30000,
    };
    if (addedOptions) {
      configs = Object.assign(configs, addedOptions);
    }

    try {
      const response = await axios.request(configs);
      logger.debug("BatcherClient._get :: response.data:", response.data);

      return { status: response.status, data: response.data };
    } catch (err) {
      // logger.debug("BatcherClient._post, err:", err);
      if (axios.isAxiosError(err)) {
        const error: AxiosError = err;

        if (error.response) {
          // The request was made and the server responded with a status code
          // that falls out of the range of 2xx
          logger.info(
            "BatcherClient._get :: error.response.data:",
            error.response.data
          );
          logger.info(
            "BatcherClient._get :: error.response.status:",
            error.response.status
          );
          logger.info(
            "BatcherClient._get :: error.response.headers:",
            error.response.headers
          );

          return { status: error.response.status, data: error.response.data };
        } else if (error.request) {
          // The request was made but no response was received
          // `error.request` is an instance of XMLHttpRequest in the browser and an instance of
          // http.ClientRequest in node.js
          logger.info("BatcherClient._get :: error.message:", error.message);

          return {
            status: -1,
            data: { code: error.code, message: error.message },
          };
        } else {
          // Something happened in setting up the request that triggered an Error
          logger.info("BatcherClient._get :: Error:", error.message);

          return {
            status: -2,
            data: { code: error.code, message: error.message },
          };
        }
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return { status: -2, data: (err as any).message };
      }
    }
  }

  async queueForNextBatch(
    batchRequestTO: IReqBatchRequest
  ): Promise<IRespBatchRequest> {
    // {
    //   batcherId?: number;
    //   batcherLabel?: string;
    //   externalId?: number;
    //   description?: string;
    //   address: string;
    //   amount: number;
    //   webhookUrl?: string;
    // }

    logger.info("BatcherClient.queueForNextBatch:", batchRequestTO);

    let result: IRespBatchRequest;
    const data = { id: 0, method: "queueForNextBatch", params: batchRequestTO };
    const response = await this._post("/api", data);

    logger.debug("BatcherClient.queueForNextBatch, response:", response);

    if (response.status >= 200 && response.status < 400) {
      result = { result: response.data.result };
    } else {
      result = {
        error: {
          code: response.data.error.code,
          message: response.data.error.message,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as IResponseError<any>,
      } as IRespBatchRequest;
    }
    return result;
  }
}

export { BatcherClient };
