import logger from "./Log2File";
import path from "path";
import LnurlConfig from "../config/LnurlConfig";
import {
  LnurlPayEntity,
  LnurlPayRequestEntity,
  LnurlWithdrawEntity,
  PrismaClient,
} from "@prisma/client";
import { SaveLnurlPayRequestWhere } from "../types/SaveLnurlPayRequestWhere";

class LnurlDBPrisma {
  private _db?: PrismaClient;

  constructor(lnurlConfig: LnurlConfig) {
    this.configureDB(lnurlConfig);
  }

  async configureDB(lnurlConfig: LnurlConfig): Promise<void> {
    logger.info("LnurlDBPrisma.configureDB", lnurlConfig);

    await this._db?.$disconnect();
    this._db = await this.initDatabase(
      path.resolve(
        lnurlConfig.BASE_DIR,
        lnurlConfig.DATA_DIR,
        lnurlConfig.DB_NAME
      )
    );
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

  async saveLnurlWithdraw(
    lnurlWithdrawEntity: LnurlWithdrawEntity
  ): Promise<LnurlWithdrawEntity> {
    const lw = await this._db?.lnurlWithdrawEntity.upsert({
      where: { secretToken: lnurlWithdrawEntity.secretToken },
      update: lnurlWithdrawEntity,
      create: lnurlWithdrawEntity,
    });

    return lw as LnurlWithdrawEntity;
  }

  async getLnurlWithdrawBySecret(
    secretToken: string
  ): Promise<LnurlWithdrawEntity> {
    const lw = await this._db?.lnurlWithdrawEntity.findUnique({
      where: { secretToken },
    });

    return lw as LnurlWithdrawEntity;
  }

  async getLnurlWithdrawByBatchRequestId(
    batchRequestId: number
  ): Promise<LnurlWithdrawEntity> {
    const lw = await this._db?.lnurlWithdrawEntity.findUnique({
      where: { batchRequestId },
    });

    return lw as LnurlWithdrawEntity;
  }

  async getLnurlWithdraw(
    lnurlWithdrawEntity: LnurlWithdrawEntity
  ): Promise<LnurlWithdrawEntity> {
    const lw = await this._db?.lnurlWithdrawEntity.findUnique({
      where: { lnurlWithdrawId: lnurlWithdrawEntity.lnurlWithdrawId },
    });

    return lw as LnurlWithdrawEntity;
  }

  async getLnurlWithdrawById(
    lnurlWithdrawId: number
  ): Promise<LnurlWithdrawEntity> {
    const lw = await this._db?.lnurlWithdrawEntity.findUnique({
      where: { lnurlWithdrawId: lnurlWithdrawId },
    });

    return lw as LnurlWithdrawEntity;
  }

  async getNonCalledbackLnurlWithdraws(lnurlWithdrawId?: number): Promise<LnurlWithdrawEntity[]> {

    // If there's a lnurlWithdrawId as arg, let's add it to the where clause!

    let lws;
    let whereClause = {
      where: {
        deleted: false,
        webhookUrl: { not: null },
        withdrawnDetails: { not: null },
        // withdrawnTs: { not: null },
        AND: [
          { OR: [{ paid: true }, { batchRequestId: { not: null } }] },
          {
            OR: [
              { paidCalledback: false },
              {
                AND: [
                  { batchedCalledback: false },
                  { batchRequestId: { not: null } },
                ],
              },
            ],
          },
        ],
      },
    }

    if (lnurlWithdrawId) {
      whereClause.where = Object.assign(whereClause.where, { lnurlWithdrawId });
    }

    // logger.debug("LnurlDBPrisma.getNonCalledbackLnurlWithdraws, whereClause=", whereClause);

    lws = await this._db?.lnurlWithdrawEntity.findMany(whereClause);

    return lws as LnurlWithdrawEntity[];
  }

  async getFallbackLnurlWithdraws(): Promise<LnurlWithdrawEntity[]> {
    const lws = await this._db?.lnurlWithdrawEntity.findMany({
      where: {
        deleted: false,
        paid: false,
        expiresAt: { lt: new Date() },
        fallbackDone: false,
        AND: [
          { NOT: { btcFallbackAddress: null } },
          { NOT: { btcFallbackAddress: "" } },
        ],
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
    const lw = await this._db?.lnurlPayEntity.findUnique({
      where: { lnurlPayId: lnurlPayId },
    });

    return lw as LnurlPayEntity;
  }

  async getLnurlPayByExternalId(externalId: string): Promise<LnurlPayEntity> {
    const lw = await this._db?.lnurlPayEntity.findUnique({
      where: { externalId },
    });

    return lw as LnurlPayEntity;
  }

  async saveLnurlPayRequest(
    lnurlPayRequestEntity: LnurlPayRequestEntity
  ): Promise<LnurlPayRequestEntity> {
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

  async getLnurlPayRequestById(
    lnurlPayRequestId: number
  ): Promise<LnurlPayRequestEntity> {
    const lw = await this._db?.lnurlPayRequestEntity.findUnique({
      where: { lnurlPayRequestId: lnurlPayRequestId },
    });

    return lw as LnurlPayRequestEntity;
  }

  async getLnurlPayRequestByLabel(
    bolt11Label: string
  ): Promise<LnurlPayRequestEntity> {
    const lw = await this._db?.lnurlPayRequestEntity.findUnique({
      where: { bolt11Label },
    });

    return lw as LnurlPayRequestEntity;
  }

  async getLnurlPayRequestByPayId(
    lnurlPayId: number
  ): Promise<LnurlPayRequestEntity[]> {
    const lw = await this._db?.lnurlPayRequestEntity.findMany({
      where: { lnurlPayEntityId: lnurlPayId },
    });

    return lw as LnurlPayRequestEntity[];
  }
}

export { LnurlDBPrisma as LnurlDB };
