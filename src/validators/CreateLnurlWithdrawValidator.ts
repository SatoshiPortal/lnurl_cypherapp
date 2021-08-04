import IReqCreateLnurlWithdraw from "../types/IReqCreateLnurlWithdraw";

class CreateLnurlWithdrawValidator {
  static validateRequest(request: IReqCreateLnurlWithdraw): boolean {
    if (request.msatoshi && request.secretToken) {
      // Mandatory msatoshi and secretToken found
      if (request.expiration) {
        if (!isNaN(new Date(request.expiration).valueOf())) {
          // Expiration date is valid
          return true;
        }
      } else {
        // No expiration date
        return true;
      }
    }
    return false;
  }
}

export { CreateLnurlWithdrawValidator };
