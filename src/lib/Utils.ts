import logger from "./Log2File";
import axios, { AxiosRequestConfig } from "axios";
import { bech32 } from "bech32"

class Utils {
  static async post(
    url: string,
    postdata: unknown,
    addedOptions?: unknown
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ): Promise<any> {
    logger.info(
      "Utils.post %s %s %s",
      url,
      JSON.stringify(postdata),
      addedOptions
    );

    let configs: AxiosRequestConfig = {
      baseURL: url,
      method: "post",
      data: postdata,
    };
    if (addedOptions) {
      configs = Object.assign(configs, addedOptions);
    }

    try {
      const response = await axios.request(configs);
      logger.debug(
        "Utils.post :: response.data = %s",
        JSON.stringify(response.data)
      );

      return { status: response.status, data: response.data };
    } catch (error) {
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        logger.info(
          "Utils.post :: error.response.data = %s",
          JSON.stringify(error.response.data)
        );
        logger.info(
          "Utils.post :: error.response.status = %d",
          error.response.status
        );
        logger.info(
          "Utils.post :: error.response.headers = %s",
          error.response.headers
        );

        return { status: error.response.status, data: error.response.data };
      } else if (error.request) {
        // The request was made but no response was received
        // `error.request` is an instance of XMLHttpRequest in the browser and an instance of
        // http.ClientRequest in node.js
        logger.info("Utils.post :: error.message = %s", error.message);

        return { status: -1, data: error.message };
      } else {
        // Something happened in setting up the request that triggered an Error
        logger.info("Utils.post :: Error: %s", error.message);

        return { status: -2, data: error.message };
      }
    }
  }

  static async encodeBech32(
    str: string
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ): Promise<String> {
    logger.info(
      "Utils.encodeBech32:",
      str
    );

    let lnurlBech32 = bech32.encode("LNURL", bech32.toWords(Buffer.from(str, 'utf8')), 2000);
    logger.debug("lnurlBech32:", lnurlBech32);

    return lnurlBech32.toUpperCase();
  }

  static async decodeBech32(
    str: string
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ): Promise<String> {
    logger.info(
      "Utils.decodeBech32:",
      str
    );

    let lnurl = Buffer.from(bech32.fromWords(bech32.decode(str, 2000).words)).toString();

    return lnurl;
  }
}

export { Utils };
