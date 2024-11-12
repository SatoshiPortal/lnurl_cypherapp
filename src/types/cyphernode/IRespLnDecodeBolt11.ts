import { IResponseError } from "../jsonrpc/IResponseMessage";

export default interface IRespLnDecodeBolt11 {
  result?: unknown;
  error?: IResponseError<never>;
}
