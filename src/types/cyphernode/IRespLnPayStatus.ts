import { IResponseError } from "../jsonrpc/IResponseMessage";
import ILnPayStatus from "./ILnPayStatus";

export default interface IRespLnPayStatus {
  result?: ILnPayStatus;
  error?: IResponseError<never>;
}
