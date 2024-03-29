import logger from "./Log2File";
import path from "path";
import LnurlConfig from "../config/LnurlConfig";
import { LnurlWithdrawEntity, PrismaClient } from "@prisma/client";

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

  async getNonCalledbackLnurlWithdraws(): Promise<LnurlWithdrawEntity[]> {
    const lws = await this._db?.lnurlWithdrawEntity.findMany({
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
    });

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
}

export { LnurlDBPrisma as LnurlDB };
