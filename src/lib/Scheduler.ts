import logger from "./Log2File";
import LnurlConfig from "../config/LnurlConfig";
import { LnurlWithdraw } from "./LnurlWithdraw";

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

  checkCallbacksTimeout(
    scheduler: Scheduler,
    lnurlWithdraw: LnurlWithdraw
  ): void {
    logger.info("Scheduler.checkCallbacksTimeout");

    scheduler._cbStartedAt = new Date().getTime();
    logger.debug(
      "Scheduler.checkCallbacksTimeout this._cbStartedAt =",
      scheduler._cbStartedAt
    );

    lnurlWithdraw.processCallbacks(undefined);
  }

  checkFallbacksTimeout(
    scheduler: Scheduler,
    lnurlWithdraw: LnurlWithdraw
  ): void {
    logger.info("Scheduler.checkFallbacksTimeout");

    scheduler._fbStartedAt = new Date().getTime();
    logger.debug(
      "Scheduler.checkFallbacksTimeout this._fbStartedAt =",
      scheduler._fbStartedAt
    );

    lnurlWithdraw.processFallbacks();
  }
}

export { Scheduler };
