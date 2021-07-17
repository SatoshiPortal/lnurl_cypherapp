import { IResponseError } from "./jsonrpc/IResponseMessage";
import { LnurlWithdrawEntity } from "../entity/LnurlWithdrawEntity";

export default interface IRespLnurlWithdraw {
  result?: LnurlWithdrawEntity;
  error?: IResponseError<never>;
}
