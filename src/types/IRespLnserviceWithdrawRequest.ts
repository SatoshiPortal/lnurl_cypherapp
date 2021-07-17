import IRespLnServiceStatus from "./IRespLnServiceStatus";

export default interface IRespLnServiceWithdrawRequest
  extends IRespLnServiceStatus {
  tag?: string;
  callback?: string;
  k1?: string;
  defaultDescription?: string;
  minWithdrawable?: number;
  maxWithdrawable?: number;
  balanceCheck?: string;
}
