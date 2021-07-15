import IReqCreateLnurlWithdraw from "../types/IReqCreateLnurlWithdraw";

class CreateLnurlWithdrawValidator {
  static validateRequest(request: IReqCreateLnurlWithdraw): boolean {
    if (request.amount && request.secretToken) {
      return true;
    } else {
      return false;
    }
  }
}

export { CreateLnurlWithdrawValidator };
