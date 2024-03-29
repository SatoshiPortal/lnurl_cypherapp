export default interface LnurlConfig {
  LOG: string;
  BASE_DIR: string;
  DATA_DIR: string;
  DB_NAME: string;
  URL_API_SERVER: string;
  URL_API_PORT: number;
  URL_API_CTX: string;
  URL_CTX_WEBHOOKS: string;
  SESSION_TIMEOUT: number;
  CN_URL: string;
  CN_API_ID: string;
  CN_API_KEY: string;
  BATCHER_URL: string;
  LN_SERVICE_SERVER: string;
  LN_SERVICE_PORT: number;
  LN_SERVICE_CTX: string;
  LN_SERVICE_WITHDRAW_REQUEST_CTX: string;
  LN_SERVICE_WITHDRAW_CTX: string;
  RETRY_WEBHOOKS_TIMEOUT: number;
  CHECK_EXPIRATION_TIMEOUT: number;
}
