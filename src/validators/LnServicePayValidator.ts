import { LnurlPayEntity } from ".prisma/client";
import IReqCreateLnurlPayRequest from "../types/IReqCreateLnurlPayRequest";

class LnServicePayValidator {
  static validateRequest(
    lnurlPay: LnurlPayEntity,
    request: IReqCreateLnurlPayRequest
  ): boolean {
    if (
      request.amount >= lnurlPay.minMsatoshi &&
      request.amount <= lnurlPay.maxMsatoshi
    ) {
      // Mandatory maxMsatoshi at least equal to minMsatoshi
      return true;
    }
    return false;
  }
}

export { LnServicePayValidator as CreateLnurlPayRequestValidator };
