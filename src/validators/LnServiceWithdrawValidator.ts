import IReqLnurlWithdraw from "../types/IReqLnurlWithdraw";
import { bech32 } from "bech32";

class LnServiceWithdrawValidator {
  static validateRequest(request: IReqLnurlWithdraw): boolean {
    if (
      typeof request.pr === "string" &&
      request.pr !== "" &&
      typeof request.k1 === "string" &&
      request.k1 !== "" &&
      (request.balanceNotify === undefined || typeof request.balanceNotify === "string")
    ) {
      const invoice = bech32.decodeUnsafe(request.pr, 8192);
      return !!invoice && /^ln(bc|tb|tbs|bcrt)([1-9][0-9]*[munp]?)?$/.test(invoice.prefix);
    } else {
      return false;
    }
  }
}

export { LnServiceWithdrawValidator };
