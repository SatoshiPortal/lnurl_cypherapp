import IRespLnServiceStatus from "./IRespLnServiceStatus";
import { IResponseError } from "./jsonrpc/IResponseMessage";
import { LnurlPayRequestEntity } from ".prisma/client";

export default interface IRespLnurlPayRequest extends IRespLnServiceStatus {
  tag?: string;
  callback?: string;
  metadata?: string;
  minSendable?: number;
  maxSendable?: number;
  pr?: string;
  routes?: string[];
  result?: LnurlPayRequestEntity;
  error?: IResponseError<never>;
}
