import IReqCreateLnurlWithdraw from "../types/IReqCreateLnurlWithdraw";

class CreateLnurlWithdrawValidator {
  static validateRequest(request: IReqCreateLnurlWithdraw): boolean {
    if (request.msatoshi) {
      // Mandatory msatoshi found
      if (request.expiresAt) {
        if (!isNaN(new Date(request.expiresAt).valueOf())) {
          // expiresAt date is valid
          return true;
        }
      } else {
        // No expiresAt date
        return true;
      }
    }
    return false;
  }
}

export { CreateLnurlWithdrawValidator };
