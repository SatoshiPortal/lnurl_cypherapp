export default interface IReqUpdateLnurlPay {
  lnurlPayId: number;
  minMsatoshi?: number;
  maxMsatoshi?: number;
  description?: string;
}
