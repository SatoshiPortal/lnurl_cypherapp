import logger from "./Log2File";
import { URL } from "url";
import { Utils } from "./Utils";

class LnAddress {
  static addressToUrl(address: string): string | false {
    const LNAddressRE = /([^@]+)@(.+)/;
    const m = address.match(LNAddressRE);
    if (m && m.length >= 2) {
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
      const resp = await Utils.get(url);

      if (resp.status >= 200 && resp.status < 400) {
        if (resp.data.callback && resp.data.tag == "payRequest") {
          const cbUrl = new URL(resp.data.callback);
          cbUrl.searchParams.set("amount", String(amount));

          const cbResp = await Utils.get(cbUrl.toString());

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
