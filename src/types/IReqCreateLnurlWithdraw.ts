export default interface IReqCreateLnurlWithdraw {
  msatoshi: number;
  description?: string;
  expiration?: Date;
  secretToken: string;
  webhookUrl?: string;
}
