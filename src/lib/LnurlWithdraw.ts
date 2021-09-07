import logger from "./Log2File";
import LnurlConfig from "../config/LnurlConfig";
import { CyphernodeClient } from "./CyphernodeClient";
import { LnurlDB } from "./LnurlDBPrisma";
import {
  ErrorCodes,
  IResponseMessage,
} from "../types/jsonrpc/IResponseMessage";
import IReqCreateLnurlWithdraw from "../types/IReqCreateLnurlWithdraw";
import IRespLnurlWithdraw from "../types/IRespLnurlWithdraw";
import { CreateLnurlWithdrawValidator } from "../validators/CreateLnurlWithdrawValidator";
import IRespLnServiceWithdrawRequest from "../types/IRespLnServiceWithdrawRequest";
import IRespLnServiceStatus from "../types/IRespLnServiceStatus";
import IReqLnurlWithdraw from "../types/IReqLnurlWithdraw";
import { Utils } from "./Utils";
import IRespLnPay from "../types/cyphernode/IRespLnPay";
import { LnServiceWithdrawValidator } from "../validators/LnServiceWithdrawValidator";
import { Scheduler } from "./Scheduler";
import { randomBytes } from "crypto";
import { BatcherClient } from "./BatcherClient";
import IReqBatchRequest from "../types/batcher/IReqBatchRequest";
import IRespBatchRequest from "../types/batcher/IRespBatchRequest";
import IReqSpend from "../types/cyphernode/IReqSpend";
import IRespSpend from "../types/cyphernode/IRespSpend";
import { LnurlWithdrawEntity } from "@prisma/client";
import AsyncLock from "async-lock";

class LnurlWithdraw {
  private _lnurlConfig: LnurlConfig;
  private _cyphernodeClient: CyphernodeClient;
  private _batcherClient: BatcherClient;
  private _lnurlDB: LnurlDB;
  private _scheduler: Scheduler;
  private _intervalCallbacksTimeout?: NodeJS.Timeout;
  private _intervalFallbacksTimeout?: NodeJS.Timeout;
  private readonly _lock = new AsyncLock();

  constructor(lnurlConfig: LnurlConfig) {
    this._lnurlConfig = lnurlConfig;
    this._cyphernodeClient = new CyphernodeClient(this._lnurlConfig);
    this._batcherClient = new BatcherClient(this._lnurlConfig);
    this._lnurlDB = new LnurlDB(this._lnurlConfig);
    this._scheduler = new Scheduler(this._lnurlConfig);
    this.startIntervals();
  }

  configureLnurl(lnurlConfig: LnurlConfig): void {
    this._lnurlConfig = lnurlConfig;
    this._lnurlDB.configureDB(this._lnurlConfig).then(() => {
      this._cyphernodeClient.configureCyphernode(this._lnurlConfig);
      this._batcherClient.configureBatcher(this._lnurlConfig);
      this._scheduler.configureScheduler(this._lnurlConfig).then(() => {
        this.startIntervals();
      });
    });
  }

  startIntervals(): void {
    if (this._intervalCallbacksTimeout) {
      clearInterval(this._intervalCallbacksTimeout);
    }
    this._intervalCallbacksTimeout = setInterval(
      this._scheduler.checkCallbacksTimeout,
      this._lnurlConfig.RETRY_WEBHOOKS_TIMEOUT * 60000,
      this._scheduler
    );

    if (this._intervalFallbacksTimeout) {
      clearInterval(this._intervalFallbacksTimeout);
    }
    this._intervalFallbacksTimeout = setInterval(
      this._scheduler.checkFallbacksTimeout,
      this._lnurlConfig.CHECK_EXPIRATION_TIMEOUT * 60000,
      this._scheduler,
      this
    );
  }

  async createLnurlWithdraw(
    reqCreateLnurlWithdraw: IReqCreateLnurlWithdraw
  ): Promise<IRespLnurlWithdraw> {
    logger.info(
      "LnurlWithdraw.createLnurlWithdraw, reqCreateLnurlWithdraw:",
      reqCreateLnurlWithdraw
    );

    const response: IRespLnurlWithdraw = {};

    if (CreateLnurlWithdrawValidator.validateRequest(reqCreateLnurlWithdraw)) {
      // Inputs are valid.
      logger.debug("LnurlWithdraw.createLnurlWithdraw, Inputs are valid.");

      const secretToken = randomBytes(16).toString("hex");

      const lnurlDecoded =
        this._lnurlConfig.LN_SERVICE_SERVER +
        (this._lnurlConfig.LN_SERVICE_PORT === 443
          ? ""
          : ":" + this._lnurlConfig.LN_SERVICE_PORT) +
        this._lnurlConfig.LN_SERVICE_CTX +
        this._lnurlConfig.LN_SERVICE_WITHDRAW_REQUEST_CTX +
        "?s=" +
        secretToken;

      const lnurl = await Utils.encodeBech32(lnurlDecoded);

      let lnurlWithdrawEntity: LnurlWithdrawEntity;
      try {
        lnurlWithdrawEntity = await this._lnurlDB.saveLnurlWithdraw(
          Object.assign(reqCreateLnurlWithdraw as LnurlWithdrawEntity, {
            lnurl: lnurl,
            secretToken: secretToken,
          })
        );
      } catch (ex) {
        logger.debug("ex:", ex);

        response.error = {
          code: ErrorCodes.InvalidRequest,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          message: (ex as any).message,
        };
        return response;
      }

      if (lnurlWithdrawEntity) {
        logger.debug(
          "LnurlWithdraw.createLnurlWithdraw, lnurlWithdraw created:",
          lnurlWithdrawEntity
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

  async deleteLnurlWithdraw(
    lnurlWithdrawId: number
  ): Promise<IRespLnurlWithdraw> {
    const result: IRespLnurlWithdraw = await this._lock.acquire(
      "modifLnurlWithdraw",
      async (): Promise<IRespLnurlWithdraw> => {
        logger.debug("acquired lock modifLnurlWithdraw in deleteLnurlWithdraw");

        logger.info(
          "LnurlWithdraw.deleteLnurlWithdraw, lnurlWithdrawId:",
          lnurlWithdrawId
        );

        const response: IRespLnurlWithdraw = {};

        if (lnurlWithdrawId) {
          // Inputs are valid.
          logger.debug("LnurlWithdraw.deleteLnurlWithdraw, Inputs are valid.");

          let lnurlWithdrawEntity = await this._lnurlDB.getLnurlWithdrawById(
            lnurlWithdrawId
          );

          // if (lnurlWithdrawEntity != null && lnurlWithdrawEntity.active) {
          if (lnurlWithdrawEntity == null) {
            logger.debug(
              "LnurlWithdraw.deleteLnurlWithdraw, lnurlWithdraw not found"
            );

            response.error = {
              code: ErrorCodes.InvalidRequest,
              message: "LnurlWithdraw not found",
            };
          } else if (!lnurlWithdrawEntity.deleted) {
            if (!lnurlWithdrawEntity.paid) {
              logger.debug(
                "LnurlWithdraw.deleteLnurlWithdraw, unpaid lnurlWithdrawEntity found for this lnurlWithdrawId!"
              );

              lnurlWithdrawEntity.deleted = true;
              lnurlWithdrawEntity = await this._lnurlDB.saveLnurlWithdraw(
                lnurlWithdrawEntity
              );

              const lnurlDecoded = await Utils.decodeBech32(
                lnurlWithdrawEntity?.lnurl || ""
              );

              response.result = Object.assign(lnurlWithdrawEntity, {
                lnurlDecoded,
              });
            } else {
              // LnurlWithdraw already paid
              logger.debug(
                "LnurlWithdraw.deleteLnurlWithdraw, LnurlWithdraw already paid."
              );

              response.error = {
                code: ErrorCodes.InvalidRequest,
                message: "LnurlWithdraw already paid",
              };
            }
          } else {
            // LnurlWithdraw already deactivated
            logger.debug(
              "LnurlWithdraw.deleteLnurlWithdraw, LnurlWithdraw already deactivated."
            );

            response.error = {
              code: ErrorCodes.InvalidRequest,
              message: "LnurlWithdraw already deactivated",
            };
          }
        } else {
          // There is an error with inputs
          logger.debug(
            "LnurlWithdraw.deleteLnurlWithdraw, there is an error with inputs."
          );

          response.error = {
            code: ErrorCodes.InvalidRequest,
            message: "Invalid arguments",
          };
        }

        return response;
      }
    );
    logger.debug("released lock modifLnurlWithdraw in deleteLnurlWithdraw");
    return result;
  }

  async getLnurlWithdraw(lnurlWithdrawId: number): Promise<IRespLnurlWithdraw> {
    logger.info(
      "LnurlWithdraw.getLnurlWithdraw, lnurlWithdrawId:",
      lnurlWithdrawId
    );

    const response: IRespLnurlWithdraw = {};

    if (lnurlWithdrawId) {
      // Inputs are valid.
      logger.debug("LnurlWithdraw.getLnurlWithdraw, Inputs are valid.");

      const lnurlWithdrawEntity = await this._lnurlDB.getLnurlWithdrawById(
        lnurlWithdrawId
      );

      if (lnurlWithdrawEntity != null) {
        logger.debug(
          "LnurlWithdraw.getLnurlWithdraw, lnurlWithdrawEntity found for this lnurlWithdrawId!"
        );

        const lnurlDecoded = await Utils.decodeBech32(
          lnurlWithdrawEntity.lnurl || ""
        );

        response.result = Object.assign(lnurlWithdrawEntity, {
          lnurlDecoded,
        });
      } else {
        // Active LnurlWithdraw not found
        logger.debug(
          "LnurlWithdraw.getLnurlWithdraw, LnurlWithdraw not found."
        );

        response.error = {
          code: ErrorCodes.InvalidRequest,
          message: "LnurlWithdraw not found",
        };
      }
    } else {
      // There is an error with inputs
      logger.debug(
        "LnurlWithdraw.getLnurlWithdraw, there is an error with inputs."
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
    const result: IRespLnServiceWithdrawRequest = await this._lock.acquire(
      "modifLnurlWithdraw",
      async (): Promise<IRespLnServiceWithdrawRequest> => {
        logger.debug(
          "acquired lock deleteLnurlWithdraw in LN Service LNURL Withdraw Request"
        );

        logger.info("LnurlWithdraw.lnServiceWithdrawRequest:", secretToken);

        let result: IRespLnServiceWithdrawRequest;
        const lnurlWithdrawEntity = await this._lnurlDB.getLnurlWithdrawBySecret(
          secretToken
        );
        logger.debug(
          "LnurlWithdraw.lnServiceWithdrawRequest, lnurlWithdrawEntity:",
          lnurlWithdrawEntity
        );

        if (lnurlWithdrawEntity == null) {
          logger.debug(
            "LnurlWithdraw.lnServiceWithdrawRequest, invalid k1 value:"
          );

          result = { status: "ERROR", reason: "Invalid k1 value" };
        } else if (!lnurlWithdrawEntity.deleted) {
          if (
            !lnurlWithdrawEntity.paid &&
            !lnurlWithdrawEntity.batchRequestId
          ) {
            // Check expiration

            if (
              lnurlWithdrawEntity.expiresAt &&
              lnurlWithdrawEntity.expiresAt < new Date()
            ) {
              // Expired LNURL
              logger.debug("LnurlWithdraw.lnServiceWithdrawRequest: expired!");

              result = { status: "ERROR", reason: "Expired LNURL-Withdraw" };
            } else {
              logger.debug("LnurlWithdraw.lnServiceWithdraw: not expired!");

              result = {
                tag: "withdrawRequest",
                callback:
                  this._lnurlConfig.LN_SERVICE_SERVER +
                  (this._lnurlConfig.LN_SERVICE_PORT === 443
                    ? ""
                    : ":" + this._lnurlConfig.LN_SERVICE_PORT) +
                  this._lnurlConfig.LN_SERVICE_CTX +
                  this._lnurlConfig.LN_SERVICE_WITHDRAW_CTX,
                k1: lnurlWithdrawEntity.secretToken,
                defaultDescription:
                  lnurlWithdrawEntity.description || undefined,
                minWithdrawable: lnurlWithdrawEntity.msatoshi || undefined,
                maxWithdrawable: lnurlWithdrawEntity.msatoshi || undefined,
              };
            }
          } else {
            logger.debug(
              "LnurlWithdraw.lnServiceWithdrawRequest, LnurlWithdraw already paid or batched"
            );

            result = {
              status: "ERROR",
              reason: "LnurlWithdraw already paid or batched",
            };
          }
        } else {
          logger.debug(
            "LnurlWithdraw.lnServiceWithdrawRequest, deactivated LNURL"
          );

          result = { status: "ERROR", reason: "Deactivated LNURL" };
        }

        logger.debug(
          "LnurlWithdraw.lnServiceWithdrawRequest, responding:",
          result
        );

        return result;
      }
    );
    logger.debug(
      "released lock deleteLnurlWithdraw in LN Service LNURL Withdraw Request"
    );
    return result;
  }

  async lnServiceWithdraw(
    params: IReqLnurlWithdraw
  ): Promise<IRespLnServiceStatus> {
    const result = await this._lock.acquire(
      "deleteLnurlWithdraw",
      async (): Promise<IRespLnServiceStatus> => {
        logger.debug(
          "acquired lock modifLnurlWithdraw in LN Service LNURL Withdraw"
        );

        logger.info("LnurlWithdraw.lnServiceWithdraw:", params);

        let result: IRespLnServiceStatus;

        if (LnServiceWithdrawValidator.validateRequest(params)) {
          // Inputs are valid.
          logger.debug("LnurlWithdraw.lnServiceWithdraw, Inputs are valid.");

          let lnurlWithdrawEntity = await this._lnurlDB.getLnurlWithdrawBySecret(
            params.k1
          );

          if (lnurlWithdrawEntity == null) {
            logger.debug("LnurlWithdraw.lnServiceWithdraw, invalid k1 value!");

            result = { status: "ERROR", reason: "Invalid k1 value" };
          } else if (!lnurlWithdrawEntity.deleted) {
            if (
              !lnurlWithdrawEntity.paid &&
              !lnurlWithdrawEntity.batchRequestId
            ) {
              logger.debug(
                "LnurlWithdraw.lnServiceWithdraw, unpaid lnurlWithdrawEntity found for this k1!"
              );

              // Check expiration
              if (
                lnurlWithdrawEntity.expiresAt &&
                lnurlWithdrawEntity.expiresAt < new Date()
              ) {
                // Expired LNURL
                logger.debug("LnurlWithdraw.lnServiceWithdraw: expired!");

                result = { status: "ERROR", reason: "Expired LNURL-Withdraw" };
              } else {
                logger.debug("LnurlWithdraw.lnServiceWithdraw: not expired!");

                if (
                  !lnurlWithdrawEntity.bolt11 ||
                  lnurlWithdrawEntity.bolt11 === params.pr
                ) {
                  logger.debug(
                    "LnurlWithdraw.lnServiceWithdraw: new bolt11 or same as previous!"
                  );

                  lnurlWithdrawEntity.bolt11 = params.pr;
                  const lnPayParams = {
                    bolt11: params.pr,
                    expectedMsatoshi: lnurlWithdrawEntity.msatoshi || undefined,
                    expectedDescription:
                      lnurlWithdrawEntity.description || undefined,
                  };
                  let resp: IRespLnPay = await this._cyphernodeClient.lnPay(
                    lnPayParams
                  );

                  if (resp.error) {
                    logger.debug(
                      "LnurlWithdraw.lnServiceWithdraw, ln_pay error, let's retry #1!"
                    );

                    resp = await this._cyphernodeClient.lnPay(lnPayParams);
                  }

                  if (resp.error) {
                    logger.debug(
                      "LnurlWithdraw.lnServiceWithdraw, ln_pay error, let's retry #2!"
                    );

                    resp = await this._cyphernodeClient.lnPay(lnPayParams);
                  }

                  if (resp.error) {
                    logger.debug(
                      "LnurlWithdraw.lnServiceWithdraw, ln_pay error!"
                    );

                    result = { status: "ERROR", reason: resp.error.message };

                    lnurlWithdrawEntity.withdrawnDetails = JSON.stringify(
                      resp.error
                    );

                    lnurlWithdrawEntity = await this._lnurlDB.saveLnurlWithdraw(
                      lnurlWithdrawEntity
                    );
                  } else {
                    logger.debug(
                      "LnurlWithdraw.lnServiceWithdraw, ln_pay success!"
                    );

                    result = { status: "OK" };

                    lnurlWithdrawEntity.withdrawnDetails = JSON.stringify(
                      resp.result
                    );
                    lnurlWithdrawEntity.withdrawnTs = new Date();
                    lnurlWithdrawEntity.paid = true;

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
                    "LnurlWithdraw.lnServiceWithdraw, trying to redeem twice with different bolt11!"
                  );

                  result = {
                    status: "ERROR",
                    reason: "Trying to redeem twice with different bolt11",
                  };
                }
              }
            } else {
              logger.debug(
                "LnurlWithdraw.lnServiceWithdraw, already paid or batched!"
              );

              result = {
                status: "ERROR",
                reason: "LnurlWithdraw already paid or batched",
              };
            }
          } else {
            logger.debug("LnurlWithdraw.lnServiceWithdraw, deactivated LNURL!");

            result = { status: "ERROR", reason: "Deactivated LNURL" };
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

        logger.debug("LnurlWithdraw.lnServiceWithdraw, responding:", result);

        return result;
      }
    );
    logger.debug(
      "released lock modifLnurlWithdraw in LN Service LNURL Withdraw"
    );
    return result;
  }

  async processCallbacks(
    lnurlWithdrawEntity?: LnurlWithdrawEntity
  ): Promise<void> {
    await this._lock.acquire(
      "processCallbacks",
      async (): Promise<void> => {
        logger.debug("acquired lock processCallbacks in processCallbacks");

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
        let postdata = {};
        lnurlWithdrawEntitys.forEach(async (lnurlWithdrawEntity) => {
          logger.debug(
            "LnurlWithdraw.processCallbacks, lnurlWithdrawEntity=",
            lnurlWithdrawEntity
          );

          if (
            !lnurlWithdrawEntity.deleted &&
            lnurlWithdrawEntity.webhookUrl &&
            lnurlWithdrawEntity.webhookUrl.length > 0 &&
            lnurlWithdrawEntity.withdrawnDetails &&
            lnurlWithdrawEntity.withdrawnDetails.length > 0
          ) {
            if (
              !lnurlWithdrawEntity.batchedCalledback &&
              lnurlWithdrawEntity.batchRequestId
            ) {
              // Payment has been batched, not yet paid
              postdata = {
                action: "fallbackBatched",
                lnurlWithdrawId: lnurlWithdrawEntity.lnurlWithdrawId,
                btcFallbackAddress: lnurlWithdrawEntity.btcFallbackAddress,
                details: lnurlWithdrawEntity.withdrawnDetails
                  ? JSON.parse(lnurlWithdrawEntity.withdrawnDetails)
                  : null,
              };
              logger.debug(
                "LnurlWithdraw.processCallbacks, batched, postdata=",
                postdata
              );

              response = await Utils.post(
                lnurlWithdrawEntity.webhookUrl,
                postdata
              );

              if (response.status >= 200 && response.status < 400) {
                logger.debug(
                  "LnurlWithdraw.processCallbacks, batched, webhook called back"
                );

                lnurlWithdrawEntity.batchedCalledback = true;
                lnurlWithdrawEntity.batchedCalledbackTs = new Date();
                await this._lnurlDB.saveLnurlWithdraw(lnurlWithdrawEntity);
              }
            }

            if (
              !lnurlWithdrawEntity.paidCalledback &&
              lnurlWithdrawEntity.paid
            ) {
              // Payment has been sent

              if (lnurlWithdrawEntity.fallbackDone) {
                // If paid through fallback...
                postdata = {
                  action: "fallbackPaid",
                  lnurlWithdrawId: lnurlWithdrawEntity.lnurlWithdrawId,
                  btcFallbackAddress: lnurlWithdrawEntity.btcFallbackAddress,
                  details: lnurlWithdrawEntity.withdrawnDetails
                    ? JSON.parse(lnurlWithdrawEntity.withdrawnDetails)
                    : null,
                };
              } else {
                // If paid through LN...
                postdata = {
                  action: "lnPaid",
                  lnurlWithdrawId: lnurlWithdrawEntity.lnurlWithdrawId,
                  bolt11: lnurlWithdrawEntity.bolt11,
                  lnPayResponse: lnurlWithdrawEntity.withdrawnDetails
                    ? JSON.parse(lnurlWithdrawEntity.withdrawnDetails)
                    : null,
                };
              }

              logger.debug(
                "LnurlWithdraw.processCallbacks, paid, postdata=",
                postdata
              );

              response = await Utils.post(
                lnurlWithdrawEntity.webhookUrl,
                postdata
              );

              if (response.status >= 200 && response.status < 400) {
                logger.debug(
                  "LnurlWithdraw.processCallbacks, paid, webhook called back"
                );

                lnurlWithdrawEntity.paidCalledback = true;
                lnurlWithdrawEntity.paidCalledbackTs = new Date();
                await this._lnurlDB.saveLnurlWithdraw(lnurlWithdrawEntity);
              }
            }
          }
        });
      }
    );
    logger.debug("released lock processCallbacks in processCallbacks");
  }

  async processFallbacks(): Promise<void> {
    await this._lock.acquire(
      "processFallbacks",
      async (): Promise<void> => {
        logger.debug("acquired lock processFallbacks in processFallbacks");

        logger.info("LnurlWithdraw.processFallbacks");

        const lnurlWithdrawEntitys = await this._lnurlDB.getFallbackLnurlWithdraws();
        logger.debug(
          "LnurlWithdraw.processFallbacks, lnurlWithdrawEntitys=",
          lnurlWithdrawEntitys
        );

        lnurlWithdrawEntitys.forEach(async (lnurlWithdrawEntity) => {
          logger.debug(
            "LnurlWithdraw.processFallbacks, lnurlWithdrawEntity=",
            lnurlWithdrawEntity
          );

          if (lnurlWithdrawEntity.batchFallback) {
            logger.debug("LnurlWithdraw.processFallbacks, batched fallback");

            if (lnurlWithdrawEntity.batchRequestId) {
              logger.debug("LnurlWithdraw.processFallbacks, already batched!");
            } else {
              const batchRequestTO: IReqBatchRequest = {
                externalId: lnurlWithdrawEntity.externalId || undefined,
                description: lnurlWithdrawEntity.description || undefined,
                address: lnurlWithdrawEntity.btcFallbackAddress || "",
                amount: Math.round(lnurlWithdrawEntity.msatoshi / 1000) / 1e8,
                webhookUrl:
                  this._lnurlConfig.URL_API_SERVER +
                  ":" +
                  this._lnurlConfig.URL_API_PORT +
                  this._lnurlConfig.URL_CTX_WEBHOOKS,
              };

              const resp: IRespBatchRequest = await this._batcherClient.queueForNextBatch(
                batchRequestTO
              );

              if (resp.error) {
                logger.debug(
                  "LnurlWithdraw.processFallbacks, queueForNextBatch error!"
                );

                lnurlWithdrawEntity.withdrawnDetails = JSON.stringify(
                  resp.error
                );
              } else {
                logger.debug(
                  "LnurlWithdraw.processFallbacks, queueForNextBatch success!"
                );

                lnurlWithdrawEntity.withdrawnDetails = JSON.stringify(
                  resp.result
                );
                lnurlWithdrawEntity.batchRequestId =
                  resp.result?.batchRequestId || null;
              }

              lnurlWithdrawEntity = await this._lnurlDB.saveLnurlWithdraw(
                lnurlWithdrawEntity
              );

              if (lnurlWithdrawEntity.batchRequestId) {
                this.processCallbacks(lnurlWithdrawEntity);
              }
            }
          } else {
            logger.debug(
              "LnurlWithdraw.processFallbacks, not batched fallback"
            );

            const spendRequestTO: IReqSpend = {
              address: lnurlWithdrawEntity.btcFallbackAddress || "",
              amount: Math.round(lnurlWithdrawEntity.msatoshi / 1000) / 1e8,
            };

            const spendResp: IRespSpend = await this._cyphernodeClient.spend(
              spendRequestTO
            );

            if (spendResp?.error) {
              // There was an error on Cyphernode end, return that.
              logger.debug(
                "LnurlWithdraw.processFallbacks: There was an error on Cyphernode spend."
              );

              lnurlWithdrawEntity.withdrawnDetails = JSON.stringify(
                spendResp.error
              );
            } else if (spendResp?.result) {
              logger.debug(
                "LnurlWithdraw.processFallbacks: Cyphernode spent: ",
                spendResp.result
              );
              lnurlWithdrawEntity.withdrawnDetails = JSON.stringify(
                spendResp.result
              );
              lnurlWithdrawEntity.withdrawnTs = new Date();
              lnurlWithdrawEntity.paid = true;
              lnurlWithdrawEntity.fallbackDone = true;
            }

            lnurlWithdrawEntity = await this._lnurlDB.saveLnurlWithdraw(
              lnurlWithdrawEntity
            );

            if (lnurlWithdrawEntity.fallbackDone) {
              this.processCallbacks(lnurlWithdrawEntity);
            }
          }
        });
      }
    );
    logger.debug("released lock processFallbacks in processFallbacks");
  }

  async forceFallback(lnurlWithdrawId: number): Promise<IRespLnurlWithdraw> {
    const result: IRespLnurlWithdraw = await this._lock.acquire(
      "processFallbacks",
      async (): Promise<IRespLnurlWithdraw> => {
        logger.debug("acquired lock processFallbacks in forceFallback");

        logger.info(
          "LnurlWithdraw.forceFallback, lnurlWithdrawId:",
          lnurlWithdrawId
        );

        const response: IRespLnurlWithdraw = {};

        if (lnurlWithdrawId) {
          // Inputs are valid.
          logger.debug("LnurlWithdraw.forceFallback, Inputs are valid.");

          let lnurlWithdrawEntity = await this._lnurlDB.getLnurlWithdrawById(
            lnurlWithdrawId
          );

          // if (lnurlWithdrawEntity != null && lnurlWithdrawEntity.active) {
          if (lnurlWithdrawEntity == null) {
            logger.debug(
              "LnurlWithdraw.forceFallback, lnurlWithdraw not found"
            );

            response.error = {
              code: ErrorCodes.InvalidRequest,
              message: "LnurlWithdraw not found",
            };
          } else if (!lnurlWithdrawEntity.deleted) {
            if (!lnurlWithdrawEntity.paid) {
              logger.debug(
                "LnurlWithdraw.forceFallback, unpaid lnurlWithdrawEntity found for this lnurlWithdrawId!"
              );

              const yesterday = new Date();
              yesterday.setDate(yesterday.getDate() - 1);
              lnurlWithdrawEntity.expiresAt = yesterday;
              lnurlWithdrawEntity = await this._lnurlDB.saveLnurlWithdraw(
                lnurlWithdrawEntity
              );

              const lnurlDecoded = await Utils.decodeBech32(
                lnurlWithdrawEntity?.lnurl || ""
              );

              response.result = Object.assign(lnurlWithdrawEntity, {
                lnurlDecoded,
              });
            } else {
              // LnurlWithdraw already paid
              logger.debug(
                "LnurlWithdraw.forceFallback, LnurlWithdraw already paid."
              );

              response.error = {
                code: ErrorCodes.InvalidRequest,
                message: "LnurlWithdraw already paid",
              };
            }
          } else {
            // LnurlWithdraw already deactivated
            logger.debug(
              "LnurlWithdraw.forceFallback, LnurlWithdraw already deactivated."
            );

            response.error = {
              code: ErrorCodes.InvalidRequest,
              message: "LnurlWithdraw already deactivated",
            };
          }
        } else {
          // There is an error with inputs
          logger.debug(
            "LnurlWithdraw.forceFallback, there is an error with inputs."
          );

          response.error = {
            code: ErrorCodes.InvalidRequest,
            message: "Invalid arguments",
          };
        }

        return response;
      }
    );
    logger.debug("released lock processFallbacks in forceFallback");
    return result;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async processBatchWebhook(webhookBody: any): Promise<IResponseMessage> {
    logger.info("LnurlWithdraw.processBatchWebhook,", webhookBody);

    // {
    //     batchRequestId: 48,
    //     batchId: 8,
    //     cnBatcherId: 1,
    //     requestCountInBatch: 12,
    //     status: "accepted",
    //     txid: "fc02518e32c22574158b96a513be92739ecb02d0caa463bb273e28d2efead8be",
    //     hash: "fc02518e32c22574158b96a513be92739ecb02d0caa463bb273e28d2efead8be",
    //     details: {
    //       address: "2N8DcqzfkYi8CkYzvNNS5amoq3SbAcQNXKp",
    //       amount: 0.0001,
    //       firstseen: 1584568841,
    //       size: 222,
    //       vsize: 141,
    //       replaceable: 0,
    //       fee: 0.00000141,
    //     }
    // }

    let lnurlWithdrawEntity = await this._lnurlDB.getLnurlWithdrawByBatchRequestId(
      webhookBody.batchRequestId
    );

    const result: IResponseMessage = {
      id: webhookBody.id,
      result: "Merci bonsouère!",
    } as IResponseMessage;

    lnurlWithdrawEntity.withdrawnDetails = JSON.stringify(webhookBody);
    lnurlWithdrawEntity.withdrawnTs = new Date();
    lnurlWithdrawEntity.paid = true;
    lnurlWithdrawEntity.fallbackDone = true;
    lnurlWithdrawEntity = await this._lnurlDB.saveLnurlWithdraw(
      lnurlWithdrawEntity
    );

    this.processCallbacks(lnurlWithdrawEntity);

    return result;
  }
}

export { LnurlWithdraw };
