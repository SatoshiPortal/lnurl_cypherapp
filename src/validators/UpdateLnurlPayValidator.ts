import IReqUpdateLnurlPay from "../types/IReqUpdateLnurlPay";

class UpdateLnurlPayValidator {
  static validateRequest(request: IReqUpdateLnurlPay): boolean {
    if (request.lnurlPayId) {
      if (
        (!!request.minMsatoshi || !!request.maxMsatoshi) &&
        (request.maxMsatoshi || 0) >= (request.minMsatoshi || 0)
      ) {
        // Mandatory maxMsatoshi at least equal to minMsatoshi
        return true;
      }
    }
    return false;
  }
}

export { UpdateLnurlPayValidator };
