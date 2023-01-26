import { IResponseError } from "./jsonrpc/IResponseMessage";

export default interface IRespLnurlPayRequestCallback {
  result?: string;
  error?: IResponseError<never>;
}
