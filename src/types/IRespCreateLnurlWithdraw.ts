import { IResponseError } from "./jsonrpc/IResponseMessage";
import { LnurlWithdrawRequest } from "../entity/LnurlWithdrawRequest";

export default interface IRespCreateLnurlWithdraw {
  result?: LnurlWithdrawRequest;
  error?: IResponseError<never>;
}
