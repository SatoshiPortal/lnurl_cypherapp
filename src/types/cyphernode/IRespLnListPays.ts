import { IResponseError } from "../jsonrpc/IResponseMessage";
import ILnListPays from "./ILnListPays";

export default interface IRespLnListPays {
  result?: ILnListPays;
  error?: IResponseError<never>;
}
