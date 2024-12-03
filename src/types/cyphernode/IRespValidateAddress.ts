import { IResponseError } from "../jsonrpc/IResponseMessage";

export default interface IRespValidateAddress {
  result?: { isvalid: boolean };
  error?: IResponseError<never>;
}
