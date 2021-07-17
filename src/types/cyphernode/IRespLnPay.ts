import { IResponseError } from "../jsonrpc/IResponseMessage";

export default interface IRespLnPay {
  result?: unknown;
  error?: IResponseError<never>;
}
