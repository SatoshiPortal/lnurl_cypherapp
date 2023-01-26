import logger from "./Log2File";
import axios, { AxiosError, AxiosRequestConfig } from "axios";
import { bech32 } from "bech32";

class Utils {
  static async request(
    method: "post" | "get",
    url: string,
    postdata?: unknown,
    addedOptions?: unknown
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ): Promise<any> {
    logger.info(
      "Utils.request",
      method,
      url,
      JSON.stringify(postdata),
      addedOptions
    );

    let configs: AxiosRequestConfig = {
      baseURL: url,
      method,
    };
    if (postdata) configs.data = postdata;
    if (addedOptions) {
      configs = Object.assign(configs, addedOptions);
    }

    try {
      const response = await axios.request(configs);
      logger.debug(
        "Utils.request :: response.data =",
        JSON.stringify(response.data)
      );

      return { status: response.status, data: response.data };
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const error: AxiosError = err;

        if (error.response) {
          // The request was made and the server responded with a status code
          // that falls out of the range of 2xx
          logger.info(
            "Utils.request :: error.response.data =",
            JSON.stringify(error.response.data)
          );
          logger.info(
            "Utils.request :: error.response.status =",
            error.response.status
          );
          logger.info(
            "Utils.request :: error.response.headers =",
            error.response.headers
          );

          return { status: error.response.status, data: error.response.data };
        } else if (error.request) {
          // The request was made but no response was received
          // `error.request` is an instance of XMLHttpRequest in the browser and an instance of
          // http.ClientRequest in node.js
          logger.info("Utils.request :: error.message =", error.message);

          return { status: -1, data: error.message };
        } else {
          // Something happened in setting up the request that triggered an Error
          logger.info("Utils.request :: Error:", error.message);

          return { status: -2, data: error.message };
        }
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return { status: -2, data: (err as any).message };
      }
    }
  }

  static post(
    url: string,
    postdata?: unknown,
    addedOptions?: unknown
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ): Promise<any> {
    return Utils.request("post", url, postdata, addedOptions);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static get(url: string, addedOptions?: unknown): Promise<any> {
    return Utils.request("get", url, undefined, addedOptions);
  }

  static async encodeBech32(str: string): Promise<string> {
    logger.info("Utils.encodeBech32:", str);

    const lnurlBech32 = bech32.encode(
      "LNURL",
      bech32.toWords(Buffer.from(str, "utf8")),
      2000
    );
    logger.debug("lnurlBech32:", lnurlBech32);

    return lnurlBech32.toUpperCase();
  }

  static async decodeBech32(str: string): Promise<string> {
    logger.info("Utils.decodeBech32:", str);

    const lnurl = Buffer.from(
      bech32.fromWords(bech32.decode(str, 2000).words)
    ).toString();

    return lnurl;
  }
}

export { Utils };
