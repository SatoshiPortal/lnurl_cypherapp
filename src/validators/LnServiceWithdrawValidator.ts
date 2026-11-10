import IReqLnurlWithdraw from "../types/IReqLnurlWithdraw";

class LnServiceWithdrawValidator {
  static validateRequest(request: IReqLnurlWithdraw): boolean {
    if (
      typeof request.pr === "string" &&
      request.pr !== "" &&
      typeof request.k1 === "string" &&
      request.k1 !== "" &&
      (request.balanceNotify === undefined || typeof request.balanceNotify === "string")
    ) {
      return true;
    } else {
      return false;
    }
  }
}

export { LnServiceWithdrawValidator };
