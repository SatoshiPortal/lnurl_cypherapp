import IReqCreateLnurlPay from "../types/IReqCreateLnurlPay";

class CreateLnurlPayValidator {
  static validateRequest(request: IReqCreateLnurlPay): boolean {
    if (
      !!request.minMsatoshi &&
      !!request.maxMsatoshi &&
      request.maxMsatoshi >= request.minMsatoshi
    ) {
      // Mandatory maxMsatoshi at least equal to minMsatoshi
      return true;
    }
    return false;
  }
}

export { CreateLnurlPayValidator };
