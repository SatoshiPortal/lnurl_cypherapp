export default interface IReqCreateLnurlPay {
  externalId: string;
  minMsatoshi: number;
  maxMsatoshi: number;
  description: string;
  webhookUrl?: string;
}
