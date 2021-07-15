export default interface LnurlConfig {
  LOG: string;
  BASE_DIR: string;
  DATA_DIR: string;
  DB_NAME: string;
  URL_API_SERVER: string;
  URL_API_PORT: number;
  URL_API_CTX: string;
  SESSION_TIMEOUT: number;
  CN_URL: string;
  CN_API_ID: string;
  CN_API_KEY: string;
  LN_SERVICE_SERVER: string;
  LN_SERVICE_PORT: number;
  LN_SERVICE_CTX: string;
  LN_SERVICE_WITHDRAW_REQUEST_CTX: string;
  LN_SERVICE_WITHDRAW_CTX: string;
}
