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
import IReqLnListPays from "../types/cyphernode/IReqLnListPays";

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

  async processLnPayment(
    lnurlWithdrawEntity: LnurlWithdrawEntity,
    bolt11: string
  ): Promise<Record<string, unknown>> {
    logger.debug(
      "LnurlWithdraw.processLnPayment: lnurlWithdrawEntity:",
      lnurlWithdrawEntity
    );
    logger.debug("LnurlWithdraw.processLnPayment: bolt11:", bolt11);

    let result;

    lnurlWithdrawEntity.bolt11 = bolt11;
    const lnPayParams = {
      bolt11: bolt11,
      expectedMsatoshi: lnurlWithdrawEntity.msatoshi || undefined,
      expectedDescription: lnurlWithdrawEntity.description || undefined,
    };
    let resp: IRespLnPay = await this._cyphernodeClient.lnPay(lnPayParams);

    if (resp.error) {
      logger.debug(
        "LnurlWithdraw.processLnPayment, ln_pay error, let's retry #1!"
      );

      resp = await this._cyphernodeClient.lnPay(lnPayParams);
    }

    if (resp.error) {
      logger.debug("LnurlWithdraw.processLnPayment, ln_pay error!");

      result = { status: "ERROR", reason: resp.error.message };

      lnurlWithdrawEntity.withdrawnDetails = JSON.stringify(resp.error);

      lnurlWithdrawEntity = await this._lnurlDB.saveLnurlWithdraw(
        lnurlWithdrawEntity
      );
    } else {
      logger.debug("LnurlWithdraw.processLnPayment, ln_pay success!");

      result = { status: "OK" };

      lnurlWithdrawEntity.withdrawnDetails = JSON.stringify(resp.result);
      lnurlWithdrawEntity.withdrawnTs = new Date();
      lnurlWithdrawEntity.paid = true;

      lnurlWithdrawEntity = await this._lnurlDB.saveLnurlWithdraw(
        lnurlWithdrawEntity
      );

      this.checkWebhook(lnurlWithdrawEntity);
    }

    return result;
  }

  async checkWebhook(lnurlWithdrawEntity: LnurlWithdrawEntity): Promise<void> {
    if (lnurlWithdrawEntity.webhookUrl) {
      logger.debug(
        "LnurlWithdraw.checkWebhook, about to call back the webhookUrl..."
      );

      this.processCallbacks(lnurlWithdrawEntity);
    } else {
      logger.debug("LnurlWithdraw.checkWebhook, skipping, no webhookUrl...");
    }
  }

  async processLnStatus(
    paymentStatus: string,
    lnurlWithdrawEntity: LnurlWithdrawEntity,
    bolt11: string,
    statusResult: unknown
  ): Promise<IRespLnServiceStatus> {
    let result: IRespLnServiceStatus;

    if (paymentStatus === "pending") {
      logger.debug("LnurlWithdraw.lnServiceWithdraw, payment pending...");

      result = {
        status: "ERROR",
        reason: "LnurlWithdraw payment pending",
      };
    } else if (paymentStatus === "complete") {
      logger.debug("LnurlWithdraw.lnServiceWithdraw, payment complete...");
      result = {
        status: "ERROR",
        reason: "LnurlWithdraw payment already done",
      };

      lnurlWithdrawEntity.withdrawnDetails = JSON.stringify(statusResult);
      // lnurlWithdrawEntity.withdrawnTs = new Date();
      lnurlWithdrawEntity.paid = true;

      lnurlWithdrawEntity = await this._lnurlDB.saveLnurlWithdraw(
        lnurlWithdrawEntity
      );

      this.checkWebhook(lnurlWithdrawEntity);
    } else if (paymentStatus === "failed") {
      logger.debug("LnurlWithdraw.lnServiceWithdraw, payment failed...");

      if (
        lnurlWithdrawEntity.expiresAt &&
        lnurlWithdrawEntity.expiresAt < new Date()
      ) {
        logger.debug(
          "LnurlWithdraw.lnServiceWithdraw, previous pay failed, now expired..."
        );
        result = {
          status: "ERROR",
          reason: "Expired LNURL-Withdraw",
        };
      } else {
        logger.debug(
          "LnurlWithdraw.lnServiceWithdraw, previous payment failed but not expired, retry..."
        );

        result = await this.processLnPayment(lnurlWithdrawEntity, bolt11);
      }
    } else {
      // Error, invalid paymentStatus
      logger.debug("LnurlWithdraw.lnServiceWithdraw, invalid paymentStatus...");
      result = {
        status: "ERROR",
        reason: "Something unexpected happened",
      };
    }

    return result;
  }

  async lnFetchPaymentStatus(
    bolt11: string
  ): Promise<{ paymentStatus?: string; result?: unknown }> {
    let paymentStatus;
    let result;

    const resp = await this._cyphernodeClient.lnListPays({
      bolt11,
    } as IReqLnListPays);

    if (resp.error) {
      // Error, should not happen, something's wrong, let's get out of here
      logger.debug("LnurlWithdraw.lnFetchPaymentStatus, lnListPays errored...");
    } else if (resp.result && resp.result.pays && resp.result.pays.length > 0) {
      const nonfailedpay = resp.result.pays.find((obj) => {
        return ((obj as any).status === "complete" || (obj as any).status === "pending");
      })
      logger.debug("LnurlWithdraw.lnFetchPaymentStatus, nonfailedpay =", nonfailedpay);

      if (nonfailedpay !== undefined) {
        paymentStatus = (nonfailedpay as any).status;
      } else {
        paymentStatus = "failed";
      }

      result = resp.result;
    } else {
      // Error, should not happen, something's wrong, let's try with paystatus...
      logger.debug(
        "LnurlWithdraw.lnFetchPaymentStatus, no previous listpays for this bolt11..."
      );

      const paystatus = await this._cyphernodeClient.lnPayStatus({
        bolt11,
      } as IReqLnListPays);

      if (paystatus.error) {
        // Error, should not happen, something's wrong, let's get out of here
        logger.debug(
          "LnurlWithdraw.lnFetchPaymentStatus, lnPayStatus errored..."
        );
      } else if (paystatus.result) {
        logger.debug(
          "LnurlWithdraw.lnFetchPaymentStatus, lnPayStatus success..."
        );

        // We parse paystatus result
        // pay[] is an array of payments
        // attempts[] is an array of attempts for each payment
        // As soon as there's a "success" field in attemps, payment succeeded!
        // If the last attempt doesn't have a "failure" field, it means there's a pending attempt
        // If the last attempt has a "failure" field, it means payment failed.
        let nbAttempts;
        let success = false;
        let failure = null;
        paystatus.result.pay.forEach((pay) => {
          nbAttempts = 0;
          pay.attempts.forEach((attempt) => {
            if (attempt.success) {
              success = true;
              return;
            } else if (attempt.failure) {
              failure = true;
            } else {
              failure = false;
            }
          });

          // The result of paystatus can get quite big when trying
          // to find a route (several MB).  Let's save paystatus result only
          // if not too big to avoid filling up disk space with
          // database + logging of the row.
          nbAttempts += pay.attempts.length;
          if (nbAttempts > 1000) {
            logger.debug(
              "LnurlWithdraw.lnFetchPaymentStatus, paystatus.result is too large, truncating content..."
            );
            // Let's keep two attempts, and put a message in the second one...
            pay.attempts.splice(2);
            pay.attempts[1].failure = { message: "attempts array truncated by lnurl cypherapp" };
          }
        });

        if (success) {
          paymentStatus = "complete";
        } else if (failure === false) {
          paymentStatus = "pending";
        } else {
          paymentStatus = "failed";
        }

        logger.debug(
          "LnurlWithdraw.lnFetchPaymentStatus, paymentStatus =",
          paymentStatus
        );

        result = paystatus.result;
      }
    }

    return { paymentStatus, result };
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

          const lnurlWithdrawEntity = await this._lnurlDB.getLnurlWithdrawBySecret(
            params.k1
          );

          // If a payment request has already been made, we need to check that payment
          // status first.
          // If status is failed, we can accept retrying with supplied bolt11 even if
          // it is different from the previous one.
          // If status is complete, we need to update our payment status and tell the
          // user it's already been paid.
          // If status is pending, we need to tell the user the payment is pending and
          // not allow a payment to a different bolt11.

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

              if (lnurlWithdrawEntity.bolt11) {
                // Payment request has been made before, check payment status
                const paymentStatus = await this.lnFetchPaymentStatus(
                  lnurlWithdrawEntity.bolt11
                );

                if (paymentStatus.paymentStatus === undefined) {
                  result = {
                    status: "ERROR",
                    reason: "Something unexpected happened",
                  };
                } else {
                  result = await this.processLnStatus(
                    paymentStatus.paymentStatus,
                    lnurlWithdrawEntity,
                    params.pr,
                    paymentStatus.result
                  );
                }
              } else {
                // Not previously claimed LNURL
                logger.debug(
                  "LnurlWithdraw.lnServiceWithdraw, Not previously claimed LNURL..."
                );

                // Check expiration
                if (
                  lnurlWithdrawEntity.expiresAt &&
                  lnurlWithdrawEntity.expiresAt < new Date()
                ) {
                  // Expired LNURL
                  logger.debug("LnurlWithdraw.lnServiceWithdraw: expired!");

                  result = {
                    status: "ERROR",
                    reason: "Expired LNURL-Withdraw",
                  };
                } else {
                  result = await this.processLnPayment(
                    lnurlWithdrawEntity,
                    params.pr
                  );
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
          // Let's take the latest on from database, just in case passed object has stale data
          lnurlWithdrawEntitys = await this._lnurlDB.getNonCalledbackLnurlWithdraws(lnurlWithdrawEntity.lnurlWithdrawId);
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

          let proceedToFallback = true;
          if (lnurlWithdrawEntity.bolt11) {
            // Before falling back on-chain, let's make really sure the payment has not been done...
            const paymentStatus = await this.lnFetchPaymentStatus(
              lnurlWithdrawEntity.bolt11
            );

            if (paymentStatus.paymentStatus === undefined) {
              logger.debug(
                "LnurlWithdraw.processFallbacks: Can't get LnurlWithdraw previously paid status."
              );
              proceedToFallback = false;
            } else if (paymentStatus.paymentStatus !== "failed") {
              logger.debug(
                "LnurlWithdraw.processFallbacks: LnurlWithdraw payment already " +
                paymentStatus.paymentStatus
              );
              proceedToFallback = false;

              lnurlWithdrawEntity.withdrawnDetails = JSON.stringify(
                paymentStatus.result
              );
              // lnurlWithdrawEntity.withdrawnTs = new Date();
              lnurlWithdrawEntity.paid =
                paymentStatus.paymentStatus === "complete";

              lnurlWithdrawEntity = await this._lnurlDB.saveLnurlWithdraw(
                lnurlWithdrawEntity
              );

              if (paymentStatus.paymentStatus === "complete") {
                this.checkWebhook(lnurlWithdrawEntity);
              }
            }
          }

          if (proceedToFallback) {
            if (lnurlWithdrawEntity.batchFallback) {
              logger.debug("LnurlWithdraw.processFallbacks, batched fallback");

              if (lnurlWithdrawEntity.batchRequestId) {
                logger.debug(
                  "LnurlWithdraw.processFallbacks, already batched!"
                );
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

              if (lnurlWithdrawEntity.bolt11) {
                // Payment request has been made before...
                // Before falling back on-chain, let's make really sure the payment has not been done...
                const paymentStatus = await this.lnFetchPaymentStatus(
                  lnurlWithdrawEntity.bolt11
                );

                if (paymentStatus.paymentStatus === undefined) {
                  logger.debug(
                    "LnurlWithdraw.forceFallback, can't get LnurlWithdraw previously paid status!"
                  );

                  response.error = {
                    code: ErrorCodes.InvalidRequest,
                    message: "Can't get LnurlWithdraw previously paid status",
                  };
                } else {
                  if (paymentStatus.paymentStatus !== "failed") {
                    logger.debug(
                      "LnurlWithdraw.forceFallback, LnurlWithdraw payment already " +
                      paymentStatus.paymentStatus
                    );

                    response.error = {
                      code: ErrorCodes.InvalidRequest,
                      message:
                        "LnurlWithdraw payment already " +
                        paymentStatus.paymentStatus,
                    };

                    lnurlWithdrawEntity.withdrawnDetails = JSON.stringify(
                      paymentStatus.result
                    );
                    // lnurlWithdrawEntity.withdrawnTs = new Date();
                    if (paymentStatus.paymentStatus === "complete") {
                      // We set status to paid only if completed... not when pending!
                      lnurlWithdrawEntity.paid = true;
                    }

                    lnurlWithdrawEntity = await this._lnurlDB.saveLnurlWithdraw(
                      lnurlWithdrawEntity
                    );

                    this.checkWebhook(lnurlWithdrawEntity);
                  }
                }
              }

              if (!response.error) {
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
              }
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
