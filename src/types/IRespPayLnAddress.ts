import { IResponseError } from "./jsonrpc/IResponseMessage";

export default interface IRespPayLnAddress {
  result?: string;
  error?: IResponseError<never>;
}
