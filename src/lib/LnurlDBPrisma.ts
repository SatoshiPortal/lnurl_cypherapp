import logger from "./Log2File";
import path from "path";
import LnurlConfig from "../config/LnurlConfig";
import { LnurlPayEntity, LnurlPayRequestEntity, LnurlWithdrawEntity, PrismaClient } from "@prisma/client";
import { SaveLnurlPayRequestWhere } from "../types/SaveLnurlPayRequestWhere";

class LnurlDBPrisma {
  private _db?: PrismaClient;

  constructor(lnurlConfig: LnurlConfig) {
    this.configureDB(lnurlConfig);
  }

  async configureDB(lnurlConfig: LnurlConfig): Promise<void> {
    logger.info("LnurlDBPrisma.configureDB", lnurlConfig);

    await this._db?.$disconnect();
    this._db = await this.initDatabase(path.resolve(lnurlConfig.BASE_DIR, lnurlConfig.DATA_DIR, lnurlConfig.DB_NAME));
  }

  async initDatabase(dbName: string): Promise<PrismaClient> {
    logger.info("LnurlDBPrisma.initDatabase", dbName);

    return new PrismaClient({
      datasources: {
        db: {
          // url: "file:" + dbName + "?connection_limit=1&socket_timeout=20",
          url: "file:" + dbName + "?socket_timeout=20",
        },
      },
      log: ["query", "info", "warn", "error"],
    });
  }

  async saveLnurlWithdraw(lnurlWithdrawEntity: LnurlWithdrawEntity): Promise<LnurlWithdrawEntity> {
    const lw = await this._db?.lnurlWithdrawEntity.upsert({
      where: { secretToken: lnurlWithdrawEntity.secretToken },
      update: lnurlWithdrawEntity,
      create: lnurlWithdrawEntity,
    });

    return lw as LnurlWithdrawEntity;
  }

  // Use findFirst instead of findUnique to avoid batching crash issues with Prisma. 
  // param guard checks required as findFirst can ignore undefined filters and 
  // return an unrelated row, whereas findUnique rejects invalid keys.
  async getLnurlWithdrawBySecret(secretToken: string): Promise<LnurlWithdrawEntity> {
    if (typeof secretToken !== "string") {
      throw new TypeError("Invalid secretToken");
    }

    const lw = await this._db?.lnurlWithdrawEntity.findFirst({
      where: { secretToken },
    });

    return lw as LnurlWithdrawEntity;
  }

  async getLnurlWithdrawByBatchRequestId(batchRequestId: number): Promise<LnurlWithdrawEntity> {
    if (!Number.isInteger(batchRequestId)) {
      throw new TypeError("Invalid batchRequestId");
    }

    const lw = await this._db?.lnurlWithdrawEntity.findFirst({
      where: { batchRequestId },
    });

    return lw as LnurlWithdrawEntity;
  }

  async getLnurlWithdraw(lnurlWithdrawEntity: LnurlWithdrawEntity): Promise<LnurlWithdrawEntity> {
    if (!Number.isInteger(lnurlWithdrawEntity?.lnurlWithdrawId)) {
      throw new TypeError("Invalid lnurlWithdrawId");
    }

    const lw = await this._db?.lnurlWithdrawEntity.findFirst({
      where: { lnurlWithdrawId: lnurlWithdrawEntity.lnurlWithdrawId },
    });

    return lw as LnurlWithdrawEntity;
  }

  async getLnurlWithdrawById(lnurlWithdrawId: number): Promise<LnurlWithdrawEntity> {
    if (!Number.isInteger(lnurlWithdrawId)) {
      throw new TypeError("Invalid lnurlWithdrawId");
    }

    const lw = await this._db?.lnurlWithdrawEntity.findFirst({
      where: { lnurlWithdrawId },
    });

    return lw as LnurlWithdrawEntity;
  }

  async getNonCalledbackLnurlWithdraws(lnurlWithdrawId?: number): Promise<LnurlWithdrawEntity[]> {
    // If there's a lnurlWithdrawId as arg, let's add it to the where clause!

    // We want to get all the lnurlWithdraws that:
    // - are not deleted, and
    // - have a webhookUrl set
    // and are either:
    // - Paid but paidCalledback is false, or
    // - Batched (batchRequestId is not null) but batchedCalledback is false, or
    // - Expired (expiresAt is less then current Date) but expiredCalledback is false
    //
    // If a lnurlWithdrawId is provided, we want to get that specific one but with the same conditions.

    const lws = await this._db?.lnurlWithdrawEntity.findMany({
      where: {
        lnurlWithdrawId,
        deleted: false,
        webhookUrl: { not: null },
        AND: [
          {
            OR: [
              {
                paid: true,
                paidCalledback: false,
              },
              {
                batchRequestId: { not: null },
                batchedCalledback: false,
              },
              {
                expiresAt: { lt: new Date() },
                expiredCalledback: false,
              },
            ],
          },
        ],
      },
    });

    return lws || [];
  }

  async getFallbackLnurlWithdraws(): Promise<LnurlWithdrawEntity[]> {
    const lws = await this._db?.lnurlWithdrawEntity.findMany({
      where: {
        deleted: false,
        paid: false,
        expiresAt: { lt: new Date() },
        fallbackDone: false,
        AND: [{ NOT: { btcFallbackAddress: null } }, { NOT: { btcFallbackAddress: "" } }],
      },
    });

    return lws as LnurlWithdrawEntity[];
  }

  async saveLnurlPay(lnurlPayEntity: LnurlPayEntity): Promise<LnurlPayEntity> {
    const lw = await this._db?.lnurlPayEntity.upsert({
      where: { externalId: lnurlPayEntity.externalId },
      update: lnurlPayEntity,
      create: lnurlPayEntity,
    });

    return lw as LnurlPayEntity;
  }

  async getLnurlPayById(lnurlPayId: number): Promise<LnurlPayEntity> {
    if (!Number.isInteger(lnurlPayId)) {
      throw new TypeError("Invalid lnurlPayId");
    }

    const lw = await this._db?.lnurlPayEntity.findFirst({
      where: { lnurlPayId },
    });

    return lw as LnurlPayEntity;
  }

  async getLnurlPayByExternalId(externalId: string): Promise<LnurlPayEntity> {
    if (typeof externalId !== "string") {
      throw new TypeError("Invalid externalId");
    }

    const lw = await this._db?.lnurlPayEntity.findFirst({
      where: { externalId },
    });

    return lw as LnurlPayEntity;
  }

  async saveLnurlPayRequest(lnurlPayRequestEntity: LnurlPayRequestEntity): Promise<LnurlPayRequestEntity> {
    const where: SaveLnurlPayRequestWhere = {};
    if (lnurlPayRequestEntity.lnurlPayRequestId) {
      where.lnurlPayRequestId = lnurlPayRequestEntity.lnurlPayRequestId;
    } else {
      where.bolt11Label = lnurlPayRequestEntity.bolt11Label;
    }

    const lw = await this._db?.lnurlPayRequestEntity.upsert({
      where,
      update: lnurlPayRequestEntity,
      create: lnurlPayRequestEntity,
    });

    return lw as LnurlPayRequestEntity;
  }

  async getLnurlPayRequestById(lnurlPayRequestId: number): Promise<LnurlPayRequestEntity> {
    if (!Number.isInteger(lnurlPayRequestId)) {
      throw new TypeError("Invalid lnurlPayRequestId");
    }

    const lw = await this._db?.lnurlPayRequestEntity.findFirst({
      where: { lnurlPayRequestId },
    });

    return lw as LnurlPayRequestEntity;
  }

  async getLnurlPayRequestByLabel(bolt11Label: string): Promise<LnurlPayRequestEntity> {
    if (typeof bolt11Label !== "string") {
      throw new TypeError("Invalid bolt11Label");
    }

    const lw = await this._db?.lnurlPayRequestEntity.findFirst({
      where: { bolt11Label },
    });

    return lw as LnurlPayRequestEntity;
  }

  async getLnurlPayRequestByPayId(lnurlPayId: number): Promise<LnurlPayRequestEntity[]> {
    const lw = await this._db?.lnurlPayRequestEntity.findMany({
      where: { lnurlPayEntityId: lnurlPayId },
    });

    return lw as LnurlPayRequestEntity[];
  }
}

export { LnurlDBPrisma as LnurlDB };
