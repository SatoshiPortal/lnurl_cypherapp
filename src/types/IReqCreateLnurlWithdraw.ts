export default interface IReqCreateLnurlWithdraw {
  amount: number;
  description?: string;
  expiration?: Date;
  secretToken: string;
  webhookUrl?: string;
}
