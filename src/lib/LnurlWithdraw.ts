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

class LnurlWithdraw {
  private _lnurlConfig: LnurlConfig;
  private _cyphernodeClient: CyphernodeClient;
  private _lnurlDB: LnurlDB;

  constructor(lnurlConfig: LnurlConfig) {
    this._lnurlConfig = lnurlConfig;
    this._cyphernodeClient = new CyphernodeClient(this._lnurlConfig);
    this._lnurlDB = new LnurlDB(this._lnurlConfig);
  }

  configureLnurl(lnurlConfig: LnurlConfig): void {
    this._lnurlConfig = lnurlConfig;
    this._lnurlDB.configureDB(this._lnurlConfig).then(() => {
      this._cyphernodeClient.configureCyphernode(this._lnurlConfig);
    });
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

      const lnurl = await Utils.encodeBech32(
        this._lnurlConfig.LN_SERVICE_SERVER +
          ":" +
          this._lnurlConfig.LN_SERVICE_PORT +
          this._lnurlConfig.LN_SERVICE_CTX +
          this._lnurlConfig.LN_SERVICE_WITHDRAW_REQUEST_CTX +
          "?s=" +
          reqCreateLnurlWithdraw.secretToken
      );

      const lnurlWithdrawEntity = await this._lnurlDB.saveLnurlWithdraw(
        Object.assign(reqCreateLnurlWithdraw as LnurlWithdrawEntity, {
          lnurl: lnurl,
        })
      );

      if (lnurlWithdrawEntity) {
        logger.debug(
          "LnurlWithdraw.createLnurlWithdraw, lnurlWithdraw created."
        );

        response.result = lnurlWithdrawEntity;
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
      lnurlWithdrawEntity.bolt11 = params.pr;
      lnurlWithdrawEntity = await this._lnurlDB.saveLnurlWithdraw(
        lnurlWithdrawEntity
      );

      if (lnurlWithdrawEntity != null && lnurlWithdrawEntity.active) {
        const resp: IRespLnPay = await this._cyphernodeClient.lnPay({
          bolt11: params.pr,
          expectedMsatoshi: lnurlWithdrawEntity.amount,
          expectedDescription: lnurlWithdrawEntity.description,
        });
        if (resp.error) {
          result = { status: "ERROR", reason: resp.error.message };
        } else {
          result = { status: "OK" };
        }
      } else {
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
}

export { LnurlWithdraw };
