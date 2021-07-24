import { LnurlWithdrawEntity } from "../entity/LnurlWithdrawEntity";

export default interface ILnurlWithdraw extends LnurlWithdrawEntity {
  lnurlDecoded: string;
}
