import IRespLnServiceStatus from "./IRespLnServiceStatus";

export default interface IRespLnServicePaySpecs extends IRespLnServiceStatus {
  tag?: string;
  callback?: string;
  metadata?: string;
  minSendable?: number;
  maxSendable?: number;
}
