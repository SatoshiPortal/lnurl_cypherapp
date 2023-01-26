import { IResponseError } from "../jsonrpc/IResponseMessage";

interface IRespLnCreateResult {
  payment_hash: string;
  expires_at: number;
  bolt11: string;
}

export default interface IRespLnCreate {
  result?: IRespLnCreateResult;
  error?: IResponseError<never>;
}
