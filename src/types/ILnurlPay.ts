import { LnurlPayEntity } from "@prisma/client";

export default interface ILnurlPay extends LnurlPayEntity {
  lnurlDecoded: string;
}
