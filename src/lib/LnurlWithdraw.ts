import logger from "./Log2File";
import LnurlConfig from "../config/LnurlConfig";
import { CyphernodeClient } from "./CyphernodeClient";
import { LnurlDB } from "./LnurlDB";
import {
  ErrorCodes,
  IResponseMessage,
} from "../types/jsonrpc/IResponseMessage";
import IReqCreateLnurlWithdraw from "../types/IReqCreateLnurlWithdraw";
import IRespCreateLnurlWithdraw from "../types/IRespCreateLnurlWithdraw";
import { CreateLnurlWithdrawValidator } from "../validators/CreateLnurlWithdrawValidator";
import { LnurlWithdrawRequest } from "../entity/LnurlWithdrawRequest";
import IRespLnserviceWithdrawRequest from "../types/IRespLnserviceWithdrawRequest";
import IRespLnserviceStatus from "../types/IRespLnserviceStatus";
import IReqLnurlWithdraw from "../types/IReqLnurlWithdraw";

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
  ): Promise<IRespCreateLnurlWithdraw> {
    logger.info(
      "LnurlWithdraw.createLnurlWithdraw, reqCreateLnurlWithdraw:",
      reqCreateLnurlWithdraw
    );

    const response: IRespCreateLnurlWithdraw = {};

    if (CreateLnurlWithdrawValidator.validateRequest(reqCreateLnurlWithdraw)) {
      // Inputs are valid.
      logger.debug("LnurlWithdraw.createLnurlWithdraw, Inputs are valid.");

      let lnurlWithdrawRequest: LnurlWithdrawRequest;
      let lnurl = this._lnurlConfig.LN_SERVICE_SERVER + ":" + this._lnurlConfig.LN_SERVICE_PORT + this._lnurlConfig.LN_SERVICE_CTX + this._lnurlConfig.LN_SERVICE_WITHDRAW_REQUEST_CTX + "?s=" + reqCreateLnurlWithdraw.secretToken;

      lnurlWithdrawRequest = await this._lnurlDB.saveLnurlWithdrawRequest(
        Object.assign(reqCreateLnurlWithdraw as LnurlWithdrawRequest, { lnurl: lnurl })
      );

      if (lnurlWithdrawRequest) {
        logger.debug("LnurlWithdraw.createLnurlWithdraw, lnurlWithdrawRequest created.");

        response.result = lnurlWithdrawRequest;
      } else {
        // LnurlWithdrawRequest not created
        logger.debug("LnurlWithdraw.createLnurlWithdraw, LnurlWithdrawRequest not created.");

        response.error = {
          code: ErrorCodes.InvalidRequest,
          message: "LnurlWithdrawRequest not created",
        };
      }
    } else {
      // There is an error with inputs
      logger.debug("LnurlWithdraw.createLnurlWithdraw, there is an error with inputs.");

      response.error = {
        code: ErrorCodes.InvalidRequest,
        message: "Invalid arguments",
      };
    }

    return response;
  }

  async processLnurlWithdrawRequest(secretToken: string): Promise<IRespLnserviceWithdrawRequest> {
    logger.info("LnurlWithdraw.processLnurlWithdrawRequest:", secretToken);

    let result: IRespLnserviceWithdrawRequest;
    const lnurlWithdrawRequest = await this._lnurlDB.getLnurlWithdrawRequestBySecret(secretToken);
    logger.debug("lnurlWithdrawRequest:", lnurlWithdrawRequest);

    if (lnurlWithdrawRequest != null && lnurlWithdrawRequest.active) {
      result = {
        tag: "withdrawRequest",
        callback: this._lnurlConfig.LN_SERVICE_SERVER + ":" + this._lnurlConfig.LN_SERVICE_PORT + this._lnurlConfig.LN_SERVICE_CTX + this._lnurlConfig.LN_SERVICE_WITHDRAW_CTX,
        k1: lnurlWithdrawRequest.secretToken,
        defaultDescription: lnurlWithdrawRequest.description,
        minWithdrawable: lnurlWithdrawRequest.amount,
        maxWithdrawable: lnurlWithdrawRequest.amount
      }
    } else {
      result = { status: "ERROR", reason: "Invalid k1 value" };
    }

    return result;
  }

  async processLnurlWithdraw(params: IReqLnurlWithdraw): Promise<IRespLnserviceStatus> {
    logger.info("LnurlWithdraw.processLnurlWithdraw:", params);

    let result: IRespLnserviceStatus;
    const lnurlWithdrawRequest = await this._lnurlDB.getLnurlWithdrawRequestBySecret(params.k1);

    if (lnurlWithdrawRequest != null && lnurlWithdrawRequest.active) {
      result = { status: "OK" };
    } else {
      result = { status: "ERROR", reason: "Invalid k1 value" };
    }

    return result;
  }
}

export { LnurlWithdraw };
