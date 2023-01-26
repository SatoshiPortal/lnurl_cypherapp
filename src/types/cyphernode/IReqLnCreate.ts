export default interface IReqLnCreate {
  // - msatoshi, required, amount we want to recieve
  // - label, required, unique label to identify the bolt11 invoice
  // - description, required, description to be encoded in the bolt11 invoice
  // - expiry, optional, expiry time in seconds
  // - callbackUrl, optional, callback for invoice updates / payment

  msatoshi: number;
  label: string;
  description: string;
  expiry?: number;
  callbackUrl?: string;
}
