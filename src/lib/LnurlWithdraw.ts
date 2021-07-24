import logger from "./Log2File";
import LnurlConfig from "../config/LnurlConfig";
import { CyphernodeClient } from "./CyphernodeClient";
import { LnurlDB } from "./LnurlDB";
import { ErrorCodes } from "../types/jsonrpc/IResponseMessage";
import IReqCreateLnurlWithdraw from "../types/IReqCreateLnurlWithdraw";
import IRespGetLnurlWithdraw from "../types/IRespLnurlWithdraw";
import { CreateLnurlWithdrawValidator } from "../validators/CreateLnurlWithdrawValidator";
import { LnurlWithdrawEntity } from "../entity/LnurlWithdrawEntity";
import IRespLnServiceWithdrawRequest from "../types/IRespLnServiceWithdrawRequest";
import IRespLnServiceStatus from "../types/IRespLnServiceStatus";
import IReqLnurlWithdraw from "../types/IReqLnurlWithdraw";
import { Utils } from "./Utils";
import IRespLnPay from "../types/cyphernode/IRespLnPay";
import { LnServiceWithdrawValidator } from "../validators/LnServiceWithdrawValidator";
import { Scheduler } from "./Scheduler";
import ILnurlWithdraw from "../types/ILnurlWithdraw";

class LnurlWithdraw {
  private _lnurlConfig: LnurlConfig;
  private _cyphernodeClient: CyphernodeClient;
  private _lnurlDB: LnurlDB;
  private _scheduler: Scheduler;
  private _intervalTimeout?: NodeJS.Timeout;

  constructor(lnurlConfig: LnurlConfig) {
    this._lnurlConfig = lnurlConfig;
    this._cyphernodeClient = new CyphernodeClient(this._lnurlConfig);
    this._lnurlDB = new LnurlDB(this._lnurlConfig);
    this._scheduler = new Scheduler(this._lnurlConfig);
    this.startIntervals();
  }

  configureLnurl(lnurlConfig: LnurlConfig): void {
    this._lnurlConfig = lnurlConfig;
    this._lnurlDB.configureDB(this._lnurlConfig).then(() => {
      this._cyphernodeClient.configureCyphernode(this._lnurlConfig);
      this._scheduler.configureScheduler(this._lnurlConfig).then(() => {
        this.startIntervals();
      });
    });
  }

  startIntervals(): void {
    if (this._intervalTimeout) {
      clearInterval(this._intervalTimeout);
    }
    this._intervalTimeout = setInterval(
      this._scheduler.timeout,
      this._lnurlConfig.RETRY_WEBHOOKS_TIMEOUT * 60000,
      this._scheduler,
      this
    );
  }

  async createLnurlWithdraw(
    reqCreateLnurlWithdraw: IReqCreateLnurlWithdraw
  ): Promise<IRespGetLnurlWithdraw> {
    logger.info(
      "LnurlWithdraw.createLnurlWithdraw, reqCreateLnurlWithdraw:",
      reqCreateLnurlWithdraw
    );

    const response: IRespGetLnurlWithdraw = {};

    if (CreateLnurlWithdrawValidator.validateRequest(reqCreateLnurlWithdraw)) {
      // Inputs are valid.
      logger.debug("LnurlWithdraw.createLnurlWithdraw, Inputs are valid.");

      const lnurlDecoded =
        this._lnurlConfig.LN_SERVICE_SERVER +
        ":" +
        this._lnurlConfig.LN_SERVICE_PORT +
        this._lnurlConfig.LN_SERVICE_CTX +
        this._lnurlConfig.LN_SERVICE_WITHDRAW_REQUEST_CTX +
        "?s=" +
        reqCreateLnurlWithdraw.secretToken;

      const lnurl = await Utils.encodeBech32(lnurlDecoded);

      const lnurlWithdrawEntity = await this._lnurlDB.saveLnurlWithdraw(
        Object.assign(reqCreateLnurlWithdraw as LnurlWithdrawEntity, {
          lnurl: lnurl,
        })
      );

      if (lnurlWithdrawEntity) {
        logger.debug(
          "LnurlWithdraw.createLnurlWithdraw, lnurlWithdraw created."
        );

        response.result = Object.assign(lnurlWithdrawEntity, {
          lnurlDecoded,
        });
      } else {
        // LnurlWithdraw not created
        logger.debug(
          "LnurlWithdraw.createLnurlWithdraw, LnurlWithdraw not created."
        );

        response.error = {
          code: ErrorCodes.InvalidRequest,
          message: "LnurlWithdraw not created",
        };
      }
    } else {
      // There is an error with inputs
      logger.debug(
        "LnurlWithdraw.createLnurlWithdraw, there is an error with inputs."
      );

      response.error = {
        code: ErrorCodes.InvalidRequest,
        message: "Invalid arguments",
      };
    }

    return response;
  }

  async lnServiceWithdrawRequest(
    secretToken: string
  ): Promise<IRespLnServiceWithdrawRequest> {
    logger.info("LnurlWithdraw.lnServiceWithdrawRequest:", secretToken);

    let result: IRespLnServiceWithdrawRequest;
    const lnurlWithdrawEntity = await this._lnurlDB.getLnurlWithdrawBySecret(
      secretToken
    );
    logger.debug("lnurlWithdrawEntity:", lnurlWithdrawEntity);

    if (lnurlWithdrawEntity != null && lnurlWithdrawEntity.active) {
      result = {
        tag: "withdrawRequest",
        callback:
          this._lnurlConfig.LN_SERVICE_SERVER +
          ":" +
          this._lnurlConfig.LN_SERVICE_PORT +
          this._lnurlConfig.LN_SERVICE_CTX +
          this._lnurlConfig.LN_SERVICE_WITHDRAW_CTX,
        k1: lnurlWithdrawEntity.secretToken,
        defaultDescription: lnurlWithdrawEntity.description,
        minWithdrawable: lnurlWithdrawEntity.amount,
        maxWithdrawable: lnurlWithdrawEntity.amount,
      };
    } else {
      result = { status: "ERROR", reason: "Invalid k1 value" };
    }

    return result;
  }

  async lnServiceWithdraw(
    params: IReqLnurlWithdraw
  ): Promise<IRespLnServiceStatus> {
    logger.info("LnurlWithdraw.lnServiceWithdraw:", params);

    let result: IRespLnServiceStatus;

    if (LnServiceWithdrawValidator.validateRequest(params)) {
      // Inputs are valid.
      logger.debug("LnurlWithdraw.lnServiceWithdraw, Inputs are valid.");

      let lnurlWithdrawEntity = await this._lnurlDB.getLnurlWithdrawBySecret(
        params.k1
      );

      if (lnurlWithdrawEntity != null && lnurlWithdrawEntity.active) {
        logger.debug(
          "LnurlWithdraw.lnServiceWithdraw, active lnurlWithdrawEntity found for this k1!"
        );

        lnurlWithdrawEntity.bolt11 = params.pr;

        const resp: IRespLnPay = await this._cyphernodeClient.lnPay({
          bolt11: params.pr,
          expectedMsatoshi: lnurlWithdrawEntity.amount,
          expectedDescription: lnurlWithdrawEntity.description,
        });

        if (resp.error) {
          logger.debug("LnurlWithdraw.lnServiceWithdraw, ln_pay error!");

          result = { status: "ERROR", reason: resp.error.message };

          lnurlWithdrawEntity.withdrawnDetails = resp.error.message;

          lnurlWithdrawEntity = await this._lnurlDB.saveLnurlWithdraw(
            lnurlWithdrawEntity
          );
        } else {
          logger.debug("LnurlWithdraw.lnServiceWithdraw, ln_pay success!");

          result = { status: "OK" };

          lnurlWithdrawEntity.withdrawnDetails = JSON.stringify(resp.result);
          lnurlWithdrawEntity.withdrawnTimestamp = new Date();
          lnurlWithdrawEntity.active = false;

          lnurlWithdrawEntity = await this._lnurlDB.saveLnurlWithdraw(
            lnurlWithdrawEntity
          );

          if (lnurlWithdrawEntity.webhookUrl) {
            logger.debug(
              "LnurlWithdraw.lnServiceWithdraw, about to call back the webhookUrl..."
            );

            this.processCallbacks(lnurlWithdrawEntity);
          }
        }
      } else {
        logger.debug(
          "LnurlWithdraw.lnServiceWithdraw, active lnurlWithdrawEntity NOT found for this k1!"
        );

        result = {
          status: "ERROR",
          reason: "Invalid k1 value or inactive lnurlWithdrawRequest",
        };
      }
    } else {
      // There is an error with inputs
      logger.debug(
        "LnurlWithdraw.lnServiceWithdraw, there is an error with inputs."
      );

      result = {
        status: "ERROR",
        reason: "Invalid arguments",
      };
    }

    return result;
  }

  async processCallbacks(
    lnurlWithdrawEntity?: LnurlWithdrawEntity
  ): Promise<void> {
    logger.info(
      "LnurlWithdraw.processCallbacks, lnurlWithdrawEntity=",
      lnurlWithdrawEntity
    );

    let lnurlWithdrawEntitys;
    if (lnurlWithdrawEntity) {
      lnurlWithdrawEntitys = [lnurlWithdrawEntity];
    } else {
      lnurlWithdrawEntitys = await this._lnurlDB.getNonCalledbackLnurlWithdraws();
    }
    let response;

    lnurlWithdrawEntitys.forEach(async (lnurlWithdrawEntity) => {
      logger.debug(
        "LnurlWithdraw.processCallbacks, lnurlWithdrawEntity=",
        lnurlWithdrawEntity
      );

      const postdata = {
        lnurlWithdrawId: lnurlWithdrawEntity.lnurlWithdrawId,
        bolt11: lnurlWithdrawEntity.bolt11,
        lnPayResponse: JSON.parse(lnurlWithdrawEntity.withdrawnDetails || ""),
      };
      logger.debug("LnurlWithdraw.processCallbacks, postdata=", postdata);

      response = await Utils.post(
        lnurlWithdrawEntity.webhookUrl || "",
        postdata
      );
      if (response.status >= 200 && response.status < 400) {
        logger.debug("LnurlWithdraw.processCallbacks, webhook called back");

        lnurlWithdrawEntity.calledback = true;
        lnurlWithdrawEntity.calledbackTimestamp = new Date();
        await this._lnurlDB.saveLnurlWithdraw(lnurlWithdrawEntity);
      }
    });
  }
}

export { LnurlWithdraw };
