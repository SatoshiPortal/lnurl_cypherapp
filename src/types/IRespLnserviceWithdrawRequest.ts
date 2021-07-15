import IRespLnserviceStatus from "./IRespLnserviceStatus";

export default interface IRespLnserviceWithdrawRequest extends IRespLnserviceStatus {
  tag?: string;
  callback?: string;
  k1?: string;
  defaultDescription?: string;
  minWithdrawable?: number;
  maxWithdrawable?: number;
  balanceCheck?: string;
}
