import { IResponseError } from "./jsonrpc/IResponseMessage";
import ILnurlPay from "./ILnurlPay";

export default interface IRespLnurlPay {
  result?: ILnurlPay;
  error?: IResponseError<never>;
}
