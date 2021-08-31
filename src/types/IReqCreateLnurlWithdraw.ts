export default interface IReqCreateLnurlWithdraw {
  externalId?: string;
  msatoshi: number;
  description?: string;
  expiration?: Date;
  webhookUrl?: string;
  btcFallbackAddress?: string;
  batchFallback?: boolean;
}
