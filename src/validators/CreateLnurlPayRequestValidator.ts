import { LnurlPayEntity } from ".prisma/client";
import IReqCreateLnurlPayRequest from "../types/IReqCreateLnurlPayRequest";

class CreateLnurlPayRequestValidator {
  static validateRequest(
    lnurlPay: LnurlPayEntity,
    request: IReqCreateLnurlPayRequest
  ): boolean {
    if (
      request.amount >= lnurlPay.minMsatoshi &&
      request.amount <= lnurlPay.minMsatoshi
    ) {
      // Mandatory maxMsatoshi at least equal to minMsatoshi
      return true;
    }
    return false;
  }
}

export { CreateLnurlPayRequestValidator };
