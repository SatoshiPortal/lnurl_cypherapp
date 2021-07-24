import { IResponseError } from "./jsonrpc/IResponseMessage";
import ILnurlWithdraw from "./ILnurlWithdraw";

export default interface IRespLnurlWithdraw {
  result?: ILnurlWithdraw;
  error?: IResponseError<never>;
}
