export default interface IReqLnPay {
  // - bolt11, required, lightning network bolt11 invoice
  // - expected_msatoshi, optional, amount we want to send, expected to be the same amount as the one encoded in the bolt11 invoice
  // - expected_description, optional, expected description encoded in the bolt11 invoice

  bolt11: string;
  expected_msatoshi?: number;
  expected_description?: string;
}
