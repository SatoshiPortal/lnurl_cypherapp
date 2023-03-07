import logger from "./Log2File";
import LnurlConfig from "../config/LnurlConfig";
import { CyphernodeClient } from "./CyphernodeClient";
import { LnurlDB } from "./LnurlDBPrisma";
import { ErrorCodes } from "../types/jsonrpc/IResponseMessage";
import IReqCreateLnurlPay from "../types/IReqCreateLnurlPay";
import IReqViewLnurlPay from "../types/IReqViewLnurlPay";
import IRespLnurlPay from "../types/IRespLnurlPay";
import { CreateLnurlPayValidator } from "../validators/CreateLnurlPayValidator";
import IReqCreateLnurlPayRequest from "../types/IReqCreateLnurlPayRequest";
import IRespLnServicePaySpecs from "../types/IRespLnServicePaySpecs";
import { CreateLnurlPayRequestValidator } from "../validators/LnServicePayValidator";
import IRespLnCreate from "../types/cyphernode/IRespLnCreate";
import { Utils } from "./Utils";
import { LnurlPayEntity, LnurlPayRequestEntity } from "@prisma/client";
import AsyncLock from "async-lock";
import IRespLnurlPayRequestCallback from "../types/IRespLnurlPayRequestCallback";
import IReqLnurlPayRequestCallback from "../types/IReqLnurlPayRequestCallback";
import IReqUpdateLnurlPay from "../types/IReqUpdateLnurlPay";
import { UpdateLnurlPayValidator } from "../validators/UpdateLnurlPayValidator";
import IRespLnPay from "../types/cyphernode/IRespLnPay";
import { LnAddress } from "./LnAddress";
import IRespPayLnAddress from "../types/IRespPayLnAddress";
import IRespLnServicePayRequest from "../types/IRespLnServicePayRequest";
import IRespLnurlPayRequest from "../types/IRespLnurlPayRequest";

class LnurlPay {
  private _lnurlConfig: LnurlConfig;
  private _cyphernodeClient: CyphernodeClient;
  private _lnurlDB: LnurlDB;
  private readonly _lock = new AsyncLock();

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

  // https://localhost/lnurl/paySpecs/externalId
  // https://localhost/lnurl/payRequest/externalId
  // https://lnurl.bullbitcoin.com/paySpecs/externalId
  // https://lnurl.bullbitcoin.com/payRequest/externalId
  lnurlPayUrl(externalId: string, req = false): string {
    return (
      this._lnurlConfig.LN_SERVICE_SCHEME +
      "://" +
      this._lnurlConfig.LN_SERVICE_DOMAIN +
      ((this._lnurlConfig.LN_SERVICE_SCHEME.toLowerCase() === "https" &&
        this._lnurlConfig.LN_SERVICE_PORT === 443) ||
        (this._lnurlConfig.LN_SERVICE_SCHEME.toLowerCase() === "http" &&
          this._lnurlConfig.LN_SERVICE_PORT === 80)
        ? ""
        : ":" + this._lnurlConfig.LN_SERVICE_PORT) +
      this._lnurlConfig.LN_SERVICE_CTX +
      (req
        ? this._lnurlConfig.LN_SERVICE_PAY_REQUEST_CTX
        : this._lnurlConfig.LN_SERVICE_PAY_SPECS_CTX) +
      "/" +
      externalId
    );
  }

  async createLnurlPay(
    reqCreateLnurlPay: IReqCreateLnurlPay
  ): Promise<IRespLnurlPay> {
    logger.info(
      "LnurlPay.createLnurlPay, reqCreateLnurlPay:",
      reqCreateLnurlPay
    );

    const response: IRespLnurlPay = {};

    if (CreateLnurlPayValidator.validateRequest(reqCreateLnurlPay)) {
      // Inputs are valid.
      logger.debug("LnurlPay.createLnurlPay, Inputs are valid.");

      const lnurlDecoded = this.lnurlPayUrl(reqCreateLnurlPay.externalId);

      const lnurl = await Utils.encodeBech32(lnurlDecoded);

      let lnurlPayEntity: LnurlPayEntity;
      try {
        lnurlPayEntity = await this._lnurlDB.saveLnurlPay(
          Object.assign(reqCreateLnurlPay as LnurlPayEntity, {
            lnurl: lnurl,
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

      if (lnurlPayEntity) {
        logger.debug(
          "LnurlPay.createLnurlPay, lnurlPay created:",
          lnurlPayEntity
        );

        response.result = Object.assign(lnurlPayEntity, {
          lnurlDecoded,
        });
      } else {
        // LnurlPay not created
        logger.debug("LnurlPay.createLnurlPay, LnurlPay not created.");

        response.error = {
          code: ErrorCodes.InvalidRequest,
          message: "LnurlPay not created",
        };
      }
    } else {
      // There is an error with inputs
      logger.debug("LnurlPay.createLnurlPay, there is an error with inputs.");

      response.error = {
        code: ErrorCodes.InvalidRequest,
        message: "Invalid arguments",
      };
    }

    return response;
  }

  async updateLnurlPay(
    reqUpdateLnurlPay: IReqUpdateLnurlPay
  ): Promise<IRespLnurlPay> {
    logger.info(
      "LnurlPay.updateLnurlPay, reqCreateLnurlPay:",
      reqUpdateLnurlPay
    );

    const response: IRespLnurlPay = {};

    if (UpdateLnurlPayValidator.validateRequest(reqUpdateLnurlPay)) {
      // Inputs are valid.
      logger.debug("LnurlPay.updateLnurlPay, Inputs are valid.");

      let lnurlPayEntity: LnurlPayEntity = await this._lnurlDB.getLnurlPayById(
        reqUpdateLnurlPay.lnurlPayId
      );

      if (lnurlPayEntity) {
        try {
          lnurlPayEntity = await this._lnurlDB.saveLnurlPay(
            Object.assign(lnurlPayEntity, reqUpdateLnurlPay)
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

        if (lnurlPayEntity) {
          logger.debug(
            "LnurlPay.createLnurlPay, lnurlPay created:",
            lnurlPayEntity
          );

          const lnurlDecoded = await Utils.decodeBech32(lnurlPayEntity.lnurl);

          response.result = Object.assign(lnurlPayEntity, {
            lnurlDecoded,
          });
        } else {
          // LnurlPay not updated
          logger.debug("LnurlPay.updateLnurlPay, LnurlPay not updated.");

          response.error = {
            code: ErrorCodes.InvalidRequest,
            message: "LnurlPay not updated",
          };
        }
      } else {
        logger.debug("LnurlPay.updateLnurlPay, lnurlPay not found");

        response.error = {
          code: ErrorCodes.InvalidRequest,
          message: "LnurlPay not found",
        };
      }
    } else {
      // There is an error with inputs
      logger.debug("LnurlPay.updatedLnurlPay, there is an error with inputs.");

      response.error = {
        code: ErrorCodes.InvalidRequest,
        message: "Invalid arguments",
      };
    }

    return response;
  }

  async deleteLnurlPay(lnurlPayId: number): Promise<IRespLnurlPay> {
    const result: IRespLnurlPay = await this._lock.acquire(
      "modifLnurlPay",
      async (): Promise<IRespLnurlPay> => {
        logger.debug("acquired lock modifLnurlPay in deleteLnurlPay");

        logger.info("LnurlPay.deleteLnurlPay, lnurlPayId:", lnurlPayId);

        const response: IRespLnurlPay = {};

        if (lnurlPayId) {
          // Inputs are valid.
          logger.debug("LnurlPay.deleteLnurlPay, Inputs are valid.");

          let lnurlPayEntity = await this._lnurlDB.getLnurlPayById(lnurlPayId);

          // if (lnurlPayEntity != null && lnurlPayEntity.active) {
          if (lnurlPayEntity == null) {
            logger.debug("LnurlPay.deleteLnurlPay, lnurlPay not found");

            response.error = {
              code: ErrorCodes.InvalidRequest,
              message: "LnurlPay not found",
            };
          } else if (!lnurlPayEntity.deleted) {
            logger.debug(
              "LnurlPay.deleteLnurlPay, unpaid lnurlPayEntity found for this lnurlPayId!"
            );

            lnurlPayEntity.deleted = true;
            lnurlPayEntity = await this._lnurlDB.saveLnurlPay(lnurlPayEntity);

            const lnurlDecoded = await Utils.decodeBech32(
              lnurlPayEntity?.lnurl || ""
            );

            response.result = Object.assign(lnurlPayEntity, {
              lnurlDecoded,
            });
          } else {
            // LnurlPay already deactivated
            logger.debug(
              "LnurlPay.deleteLnurlPay, LnurlPay already deactivated."
            );

            response.error = {
              code: ErrorCodes.InvalidRequest,
              message: "LnurlPay already deactivated",
            };
          }
        } else {
          // There is an error with inputs
          logger.debug(
            "LnurlPay.deleteLnurlPay, there is an error with inputs."
          );

          response.error = {
            code: ErrorCodes.InvalidRequest,
            message: "Invalid arguments",
          };
        }

        return response;
      }
    );
    logger.debug("released lock modifLnurlPay in deleteLnurlPay");
    return result;
  }

  async getLnurlPay(lnurlPayId: number): Promise<IRespLnurlPay> {
    logger.info("LnurlPay.getLnurlPay, lnurlPayId:", lnurlPayId);

    const response: IRespLnurlPay = {};

    if (lnurlPayId) {
      // Inputs are valid.
      logger.debug("LnurlPay.getLnurlPay, Inputs are valid.");

      const lnurlPayEntity = await this._lnurlDB.getLnurlPayById(lnurlPayId);

      if (lnurlPayEntity != null) {
        logger.debug(
          "LnurlPay.getLnurlPay, lnurlPayEntity found for this lnurlPayId!"
        );

        const lnurlDecoded = await Utils.decodeBech32(
          lnurlPayEntity.lnurl || ""
        );

        response.result = Object.assign(lnurlPayEntity, {
          lnurlDecoded,
        });
      } else {
        // Active LnurlPay not found
        logger.debug("LnurlPay.getLnurlPay, LnurlPay not found.");

        response.error = {
          code: ErrorCodes.InvalidRequest,
          message: "LnurlPay not found",
        };
      }
    } else {
      // There is an error with inputs
      logger.debug("LnurlPay.getLnurlPay, there is an error with inputs.");

      response.error = {
        code: ErrorCodes.InvalidRequest,
        message: "Invalid arguments",
      };
    }

    return response;
  }

  /**
   * Called by user's wallet to get Payment specs
   */
  async lnServicePaySpecs(
    reqViewLnurlPay: IReqViewLnurlPay
  ): Promise<IRespLnServicePaySpecs> {
    logger.info("LnurlPay.viewLnurlPay, reqViewLnurlPay:", reqViewLnurlPay);

    let response: IRespLnServicePaySpecs = {};
    const lnurlPay: LnurlPayEntity = await this._lnurlDB.getLnurlPayByExternalId(
      reqViewLnurlPay.externalId
    );

    if (lnurlPay) {
      if (!lnurlPay.deleted) {
        if (lnurlPay.externalId) {
          const metadata = JSON.stringify([
            ["text/plain", lnurlPay.description],
            [
              "text/identifier",
              `${lnurlPay.externalId}@${this._lnurlConfig.LN_SERVICE_DOMAIN}`,
            ],
          ]);

          logger.info("metadata =", metadata);

          response = {
            callback: this.lnurlPayUrl(lnurlPay.externalId, true),
            maxSendable: lnurlPay.maxMsatoshi,
            minSendable: lnurlPay.minMsatoshi,
            metadata: metadata,
            tag: "payRequest",
          };
        } else {
          logger.debug("LnurlPay.lnServicePaySpecs, no external id.");

          response = {
            status: "ERROR",
            reason: "Invalid arguments",
          };
        }
      } else {
        logger.debug("LnurlPay.lnServicePaySpecs, deactivated LNURL");

        response = { status: "ERROR", reason: "Deactivated LNURL" };
      }
    } else {
      // There is an error with inputs
      logger.debug("LnurlPay.lnServicePaySpecs, LNURL not found.");

      response = {
        status: "ERROR",
        reason: "Not found",
      };
    }

    return response;
  }

  /**
   * Called by user's wallet to ultimately get the bolt11 invoice
   */
  async lnServicePayRequest(
    reqCreateLnurlPayReq: IReqCreateLnurlPayRequest
  ): Promise<IRespLnServicePayRequest> {
    logger.info(
      "LnurlPay.createLnurlPayRequest, reqCreateLnurlPayReq:",
      reqCreateLnurlPayReq
    );

    let response: IRespLnServicePayRequest = {};
    const lnurlPay: LnurlPayEntity = await this._lnurlDB.getLnurlPayByExternalId(
      reqCreateLnurlPayReq.externalId
    );

    if (lnurlPay) {
      if (!lnurlPay.deleted) {
        if (
          CreateLnurlPayRequestValidator.validateRequest(
            lnurlPay,
            reqCreateLnurlPayReq
          )
        ) {
          // Inputs are valid.
          logger.debug("LnurlPay.createLnurlPayRequest, Inputs are valid.");

          const metadata = JSON.stringify([
            ["text/plain", lnurlPay.description],
            [
              "text/identifier",
              `${lnurlPay.externalId}@${this._lnurlConfig.LN_SERVICE_DOMAIN}`,
            ],
          ]);
          logger.debug("metadata =", metadata);

          const label = lnurlPay.lnurlPayId + "-" + Date.now();

          const lnCreateParams = {
            msatoshi: reqCreateLnurlPayReq.amount as number,
            label: label,
            description: metadata,
            callbackUrl:
              this._lnurlConfig.URL_API_SERVER +
              ":" +
              this._lnurlConfig.URL_API_PORT +
              this._lnurlConfig.URL_CTX_PAY_WEBHOOKS +
              "/" +
              label,
            deschashonly: true,
          };

          logger.debug(
            "LnurlPay.createLnurlPayRequest trying to get invoice",
            lnCreateParams
          );

          const resp: IRespLnCreate = await this._cyphernodeClient.lnCreate(
            lnCreateParams
          );
          logger.debug("LnurlPay.createLnurlPayRequest lnCreate invoice", resp);

          if (resp.result) {
            const data = {
              lnurlPayEntityId: lnurlPay.lnurlPayId,
              bolt11Label: label,
              msatoshi: parseInt(reqCreateLnurlPayReq.amount as string),
              bolt11: resp.result.bolt11,
              metadata: metadata,
            };

            let lnurlPayRequestEntity: LnurlPayRequestEntity;
            try {
              lnurlPayRequestEntity = await this._lnurlDB.saveLnurlPayRequest(
                data as LnurlPayRequestEntity
              );
            } catch (ex) {
              logger.debug("ex:", ex);

              response = {
                status: "ERROR",
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                reason: (ex as any).message,
              };
              return response;
            }

            if (lnurlPayRequestEntity && lnurlPayRequestEntity.bolt11) {
              logger.debug(
                "LnurlPay.createLnurlPayRequest, lnurlPayRequest created:",
                lnurlPayRequestEntity
              );

              response = {
                pr: lnurlPayRequestEntity.bolt11,
                routes: [],
              };
            } else {
              // LnurlPayRequest not created
              logger.debug(
                "LnurlPay.createLnurlPayRequest, LnurlPayRequest not created."
              );

              response = {
                status: "ERROR",
                reason: "payRequest not created",
              };
            }
          } else {
            response = {
              status: "ERROR",
              reason: "invoice not created",
            };
          }
        } else {
          // There is an error with inputs
          logger.debug(
            "LnurlPay.createLnurlPayRequest, there is an error with inputs."
          );

          response = {
            status: "ERROR",
            reason: "Invalid arguments",
          };
        }
      } else {
        logger.debug("LnurlPay.lnServicePaySpecs, deactivated LNURL");

        response = { status: "ERROR", reason: "Deactivated LNURL" };
      }
    } else {
      // There is an error with inputs
      logger.debug("LnurlPay.lnServicePaySpecs, LNURL not found.");

      response = {
        status: "ERROR",
        reason: "Not found",
      };
    }

    return response;
  }

  /**
   * Delete a payRequest, for instance if the LNPay Address is deleted.
   */
  async deleteLnurlPayRequest(
    lnurlPayRequestId: number
  ): Promise<IRespLnurlPayRequest> {
    const result: IRespLnurlPayRequest = await this._lock.acquire(
      "modifLnurlPayRequest",
      async (): Promise<IRespLnurlPayRequest> => {
        logger.debug(
          "acquired lock modifLnurlPayRequest in deleteLnurlPayRequest"
        );

        logger.info(
          "LnurlPay.deleteLnurlPayRequest, lnurlPayRequestId:",
          lnurlPayRequestId
        );

        const response: IRespLnurlPayRequest = {};

        if (lnurlPayRequestId) {
          // Inputs are valid.
          logger.debug("LnurlPay.deleteLnurlPayRequest, Inputs are valid.");

          let lnurlPayRequestEntity = await this._lnurlDB.getLnurlPayRequestById(
            lnurlPayRequestId
          );

          if (lnurlPayRequestEntity == null) {
            logger.debug(
              "LnurlPay.deleteLnurlPayRequest, lnurlPayRequest not found"
            );

            response.error = {
              code: ErrorCodes.InvalidRequest,
              message: "LnurlPayRequest not found",
            };
          } else if (
            !lnurlPayRequestEntity.deleted &&
            !lnurlPayRequestEntity.paid
          ) {
            logger.debug(
              "LnurlPay.deleteLnurlPayRequest, unpaid lnurlPayRequestEntity found for this lnurlPayRequestId!"
            );

            lnurlPayRequestEntity.deleted = true;
            lnurlPayRequestEntity = await this._lnurlDB.saveLnurlPayRequest(
              lnurlPayRequestEntity
            );

            response.result = lnurlPayRequestEntity;
          } else {
            // LnurlPayRequest already deactivated
            logger.debug(
              "LnurlPay.deleteLnurlPayRequest, LnurlPayRequest already deactivated."
            );

            response.error = {
              code: ErrorCodes.InvalidRequest,
              message: "LnurlPayRequest already deactivated",
            };
          }
        } else {
          // There is an error with inputs
          logger.debug(
            "LnurlPay.deleteLnurlPayRequest, there is an error with inputs."
          );

          response.error = {
            code: ErrorCodes.InvalidRequest,
            message: "Invalid arguments",
          };
        }

        return response;
      }
    );
    logger.debug("released lock modifLnurlPayRequest in deleteLnurlPayRequest");
    return result;
  }

  async getLnurlPayRequest(
    lnurlPayRequestId: number
  ): Promise<IRespLnurlPayRequest> {
    logger.info(
      "LnurlPay.getLnurlPayRequest, lnurlPayRequestId:",
      lnurlPayRequestId
    );

    const response: IRespLnurlPayRequest = {};

    if (lnurlPayRequestId) {
      // Inputs are valid.
      logger.debug("LnurlPay.getLnurlPayRequest, Inputs are valid.");

      const lnurlPayRequestEntity = await this._lnurlDB.getLnurlPayRequestById(
        lnurlPayRequestId
      );

      if (lnurlPayRequestEntity != null) {
        logger.debug(
          "LnurlPay.getLnurlPayRequest, lnurlPayRequestEntity found for this lnurlPayRequestId!"
        );

        response.result = lnurlPayRequestEntity;
      } else {
        // Active LnurlPayRequest not found
        logger.debug("LnurlPay.getLnurlPayRequest, LnurlPayRequest not found.");

        response.error = {
          code: ErrorCodes.InvalidRequest,
          message: "LnurlPayRequest not found",
        };
      }
    } else {
      // There is an error with inputs
      logger.debug(
        "LnurlPay.getLnurlPayRequest, there is an error with inputs."
      );

      response.error = {
        code: ErrorCodes.InvalidRequest,
        message: "Invalid arguments",
      };
    }

    return response;
  }

  /**
   * This is called by CN when an LN invoice is paid.
   */
  async lnurlPayRequestCallback(
    reqCallback: IReqLnurlPayRequestCallback
  ): Promise<IRespLnurlPayRequestCallback> {
    const result: IRespLnurlPayRequestCallback = await this._lock.acquire(
      "modifLnurlPayRequestCallback",
      async (): Promise<IRespLnurlPayRequestCallback> => {
        logger.debug(
          "acquired lock modifLnurlPayRequestCallback in lnurlPayRequestCallback"
        );

        const response: IRespLnurlPayRequestCallback = {};

        let lnurlPayRequestEntity = await this._lnurlDB.getLnurlPayRequestByLabel(
          reqCallback.bolt11Label
        );

        if (lnurlPayRequestEntity) {
          lnurlPayRequestEntity.paid = true;

          lnurlPayRequestEntity = await this._lnurlDB.saveLnurlPayRequest(
            lnurlPayRequestEntity
          );

          const lnurlPayEntity = await this._lnurlDB.getLnurlPayById(
            lnurlPayRequestEntity.lnurlPayEntityId
          );

          if (lnurlPayEntity && lnurlPayEntity.webhookUrl) {
            const cbResponse = await Utils.post(
              lnurlPayEntity.webhookUrl,
              lnurlPayRequestEntity
            );

            if (cbResponse.status >= 200 && cbResponse.status < 400) {
              logger.debug(
                "LnurlWithdraw.lnurlPayRequestCallback, paid, webhook called back"
              );

              lnurlPayRequestEntity.paidCalledbackTs = new Date();
              await this._lnurlDB.saveLnurlPayRequest(lnurlPayRequestEntity);

              response.result = "success";
            } else {
              // This will make Cyphernode redo the callback later
              response.error = {
                code: ErrorCodes.InternalError,
                message: "Downstream callback failed",
              };
            }
          }
        } else {
          response.error = {
            code: ErrorCodes.InvalidRequest,
            message: "Invalid arguments",
          };
        }

        return response;
      }
    );

    return result;
  }

  /**
   * If you want to pay to external LNURL Pay Address
   */
  async payLnAddress(req: IReqPayLnAddress): Promise<IRespPayLnAddress> {
    const bolt11 = await LnAddress.fetchBolt11(req.address, req.amountMsat);

    const response: IRespPayLnAddress = {};
    if (bolt11) {
      const lnPayParams = {
        bolt11,
        expectedMsatoshi: req.amountMsat,
      };

      let resp: IRespLnPay = await this._cyphernodeClient.lnPay(lnPayParams);

      if (resp.error) {
        logger.debug("LnurlPay.payLnAddress, ln_pay error, let's retry #1!");

        resp = await this._cyphernodeClient.lnPay(lnPayParams);
      }

      if (resp.error) {
        logger.debug("LnurlPay.payLnAddress, ln_pay error, let's retry #2!");

        resp = await this._cyphernodeClient.lnPay(lnPayParams);
      }

      if (resp.error) {
        logger.debug("LnurlPay.payLnAddress, ln_pay error!");

        response.error = {
          code: ErrorCodes.InvalidRequest,
          message: resp.error.message,
        };
      } else {
        logger.debug("LnurlWithdraw.lnServiceWithdraw, ln_pay success!");

        response.result = "OK";
      }
    } else {
      response.error = {
        code: ErrorCodes.InvalidRequest,
        message: "Unable to fetch bolt11 invoice",
      };
    }

    return response;
  }
}

export { LnurlPay };
