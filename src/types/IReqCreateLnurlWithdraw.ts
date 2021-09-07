export default interface IReqCreateLnurlWithdraw {
  externalId?: string;
  msatoshi: number;
  description?: string;
  expiresAt?: Date;
  webhookUrl?: string;
  btcFallbackAddress?: string;
  batchFallback?: boolean;
}
