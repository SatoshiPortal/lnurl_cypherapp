import IReqLnurlWithdraw from "../types/IReqLnurlWithdraw";

class LnServiceWithdrawValidator {
  static validateRequest(request: IReqLnurlWithdraw): boolean {
    if (request.pr && request.k1) {
      return true;
    } else {
      return false;
    }
  }
}

export { LnServiceWithdrawValidator };
