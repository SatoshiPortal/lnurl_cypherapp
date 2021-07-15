// lib/HttpServer.ts
import express from "express";
import logger from "./Log2File";
import AsyncLock from "async-lock";
import LnurlConfig from "../config/LnurlConfig";
import fs from "fs";
import { LnurlWithdraw } from "./LnurlWithdraw";
import {
  IResponseMessage,
  ErrorCodes,
} from "../types/jsonrpc/IResponseMessage";
import { IRequestMessage } from "../types/jsonrpc/IRequestMessage";
import { Utils } from "./Utils";
import IRespCreateLnurlWithdraw from "../types/IRespCreateLnurlWithdraw";
import IReqCreateLnurlWithdraw from "../types/IReqCreateLnurlWithdraw";
import IReqLnurlWithdraw from "../types/IReqLnurlWithdraw";

class HttpServer {
  // Create a new express application instance
  private readonly _httpServer: express.Application = express();
  private readonly _lock = new AsyncLock();
  private _lnurlConfig: LnurlConfig = JSON.parse(
    fs.readFileSync("data/config.json", "utf8")
  );
  private _lnurlWithdraw: LnurlWithdraw = new LnurlWithdraw(this._lnurlConfig);

  setup(): void {
    logger.debug("setup");
    this._httpServer.use(express.json());
  }

  async loadConfig(): Promise<void> {
    logger.debug("loadConfig");

    this._lnurlConfig = JSON.parse(
      fs.readFileSync("data/config.json", "utf8")
    );

    this._lnurlWithdraw.configureLnurl(this._lnurlConfig);
  }

  async createLnurlWithdraw(
    params: object | undefined
  ): Promise<IRespCreateLnurlWithdraw> {
    logger.debug("/createLnurlWithdraw params:", params);

    const reqCreateLnurlWithdraw: IReqCreateLnurlWithdraw = params as IReqCreateLnurlWithdraw;

    return await this._lnurlWithdraw.createLnurlWithdraw(reqCreateLnurlWithdraw);
  }

  async start(): Promise<void> {
    logger.info("Starting incredible service");

    this.setup();

    this._httpServer.post(this._lnurlConfig.URL_API_CTX, async (req, res) => {
      logger.debug(this._lnurlConfig.URL_API_CTX);

      const reqMessage: IRequestMessage = req.body;
      logger.debug("reqMessage.method:", reqMessage.method);
      logger.debug("reqMessage.params:", reqMessage.params);

      const response: IResponseMessage = {
        id: reqMessage.id,
      } as IResponseMessage;

      // Check the method and call the corresponding function
      switch (reqMessage.method) {

        case "createLnurlWithdraw": {
          const result: IRespCreateLnurlWithdraw = await this.createLnurlWithdraw(
            reqMessage.params || {}
          );
          response.result = result.result;
          response.error = result.error;
          break;
        }

        case "encodeBech32": {
          response.result = await Utils.encodeBech32((reqMessage.params as any).s);
          break;
        }

        case "decodeBech32": {
          response.result = await Utils.decodeBech32((reqMessage.params as any).s);
          break;
        }

        case "reloadConfig":
          await this.loadConfig();

        // eslint-disable-next-line no-fallthrough
        case "getConfig":
          response.result = this._lnurlConfig;
          break;

        default:
          response.error = {
            code: ErrorCodes.MethodNotFound,
            message: "No such method!",
          };
          break;
      }

      if (response.error) {
        response.error.data = reqMessage.params as never;
        res.status(400).json(response);
      } else {
        res.status(200).json(response);
      }
    });

    // LN Service LNURL Withdraw Request
    this._httpServer.get(
      this._lnurlConfig.LN_SERVICE_WITHDRAW_REQUEST_CTX,
      async (req, res) => {
        logger.info(
          this._lnurlConfig.LN_SERVICE_WITHDRAW_REQUEST_CTX + ":",
          req.query
        );

        const response = await this._lnurlWithdraw.processLnurlWithdrawRequest(req.query.s as string);

        if (response.status) {
          res.status(400).json(response);
        } else {
          res.status(200).json(response);
        }
      }
    );

    // LN Service LNURL Withdraw
    this._httpServer.get(
      this._lnurlConfig.LN_SERVICE_WITHDRAW_CTX,
      async (req, res) => {
        logger.info(
          this._lnurlConfig.LN_SERVICE_WITHDRAW_CTX + ":",
          req.query
        );

        const response = await this._lnurlWithdraw.processLnurlWithdraw({ k1: req.query.k1, pr: req.query.pr, balanceNotify: req.query.balanceNotify } as IReqLnurlWithdraw);

        if (response.status === "ERROR") {
          res.status(400).json(response);
        } else {
          res.status(200).json(response);
        }
      }
    );
    
    this._httpServer.listen(this._lnurlConfig.URL_API_PORT, () => {
      logger.info(
        "Express HTTP server listening on port:",
        this._lnurlConfig.URL_API_PORT
      );
    });
  }
}

export { HttpServer };
