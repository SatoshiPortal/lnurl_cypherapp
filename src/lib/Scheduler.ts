import logger from "./Log2File";
import LnurlConfig from "../config/LnurlConfig";
import { Utils } from "./Utils";

class Scheduler {
  private _lnurlConfig: LnurlConfig;
  private _cbStartedAt = new Date().getTime();
  private _fbStartedAt = new Date().getTime();

  constructor(lnurlWithdrawConfig: LnurlConfig) {
    this._lnurlConfig = lnurlWithdrawConfig;
  }

  async configureScheduler(lnurlWithdrawConfig: LnurlConfig): Promise<void> {
    this._lnurlConfig = lnurlWithdrawConfig;
    this._cbStartedAt = new Date().getTime();
    this._fbStartedAt = new Date().getTime();
  }

  checkCallbacksTimeout(scheduler: Scheduler): void {
    logger.info("Scheduler.checkCallbacksTimeout");

    scheduler._cbStartedAt = new Date().getTime();
    logger.debug(
      "Scheduler.checkCallbacksTimeout this._cbStartedAt =",
      scheduler._cbStartedAt
    );

    // lnurlWithdraw.processCallbacks(undefined);
    const postdata = {
      id: 0,
      method: "processCallbacks",
    };

    Utils.post(
      scheduler._lnurlConfig.URL_API_SERVER +
        ":" +
        scheduler._lnurlConfig.URL_API_PORT +
        scheduler._lnurlConfig.URL_API_CTX,
      postdata
    ).then((res) => {
      logger.debug("Scheduler.checkCallbacksTimeout, res=", res);
    });
  }

  checkFallbacksTimeout(scheduler: Scheduler): void {
    logger.info("Scheduler.checkFallbacksTimeout");

    scheduler._fbStartedAt = new Date().getTime();
    logger.debug(
      "Scheduler.checkFallbacksTimeout this._fbStartedAt =",
      scheduler._fbStartedAt
    );

    // lnurlWithdraw.processFallbacks();
    const postdata = {
      id: 0,
      method: "processFallbacks",
    };

    Utils.post(
      scheduler._lnurlConfig.URL_API_SERVER +
        ":" +
        scheduler._lnurlConfig.URL_API_PORT +
        scheduler._lnurlConfig.URL_API_CTX,
      postdata
    ).then((res) => {
      logger.debug("Scheduler.checkFallbacksTimeout, res=", res);
    });
  }
}

export { Scheduler };
