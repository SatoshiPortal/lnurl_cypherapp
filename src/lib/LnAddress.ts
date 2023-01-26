import logger from "./Log2File";
import { URL } from "url";
import { Utils } from "./Utils";

class LnAddress {
  static addressToUrl(address: string): string | false {
    //const LNAddressRE = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    const LNAddressRE = /([^@]+)@(.+)/;
    const m = address.match(LNAddressRE);
    logger.debug("matches", m);
    //if (m && m.length >= 6) {
    if (m && m.length >= 2) {
      logger.info("LnAddress: success ", address);

      //return `https://${m[5]}/.well-known/lnurlp/${m[1]}`;
      return `http://${m[2]}/.well-known/lnurlp/${m[1]}`;
    }

    return false;
  }

  static async fetchBolt11(
    address: string,
    amount: number
  ): Promise<string | false> {
    const url = LnAddress.addressToUrl(address);

    if (url) {
      logger.debug("calling", url);
      const resp = await Utils.get(url);
      logger.debug("resp", resp.data.callback);
      if (resp.status >= 200 && resp.status < 400) {
        logger.debug("lnurl called", resp.data);
        if (resp.data.callback && resp.data.tag == "payRequest") {
          const cbUrl = new URL(resp.data.callback);
          cbUrl.searchParams.set("amount", String(amount));
          logger.debug("calling url ", cbUrl);
          const cbResp = await Utils.get(cbUrl.toString());
          logger.debug("cbResp", cbResp);
          if (cbResp.status >= 200 && cbResp.status < 400) {
            if (cbResp.data && cbResp.data.pr) {
              return cbResp.data.pr;
            } else {
              logger.debug("fetchBolt11: no valid bolt11 invoice provided");
            }
          } else {
            logger.debug("fetchBolt11: failed calling callback url");
          }
        } else {
          logger.debug("fetchBolt11: no callback url provided");
        }
      } else {
        logger.debug("fetchBolt11: failed calling lnurl", url);
      }
    } else {
      logger.debug("fetchBolt11: not a valid lightning address");
    }

    return false;
  }
}

export { LnAddress };
