import { IResponseError } from "./jsonrpc/IResponseMessage";
import { LnurlPayRequestEntity } from "@prisma/client";

export default interface IRespLnurlPayRequest {
  result?: LnurlPayRequestEntity;
  error?: IResponseError<never>;
}
