import IRespLnServiceStatus from "./IRespLnServiceStatus";

export default interface IRespLnServicePayRequest extends IRespLnServiceStatus {
  pr?: string;
  routes?: string[];
}
