import logger from "./Log2File";
import LnurlConfig from "../config/LnurlConfig";
import { LnurlWithdraw } from "./LnurlWithdraw";

class Scheduler {
  private _lnurlConfig: LnurlConfig;
  private _startedAt = new Date().getTime();

  constructor(lnurlWithdrawConfig: LnurlConfig) {
    this._lnurlConfig = lnurlWithdrawConfig;
  }

  async configureScheduler(lnurlWithdrawConfig: LnurlConfig): Promise<void> {
    this._lnurlConfig = lnurlWithdrawConfig;
    this._startedAt = new Date().getTime();
  }

  timeout(scheduler: Scheduler, lnurlWithdraw: LnurlWithdraw): void {
    logger.info("Scheduler.timeout");

    scheduler._startedAt = new Date().getTime();
    logger.debug("Scheduler.timeout this._startedAt =", scheduler._startedAt);

    lnurlWithdraw.processCallbacks(undefined);
  }
}

export { Scheduler };
