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
    // let lw;
    // if (lnurlWithdrawEntity.lnurlWithdrawId) {
    //   lw = await this._db?.lnurlWithdrawEntity.update({
    //     where: { lnurlWithdrawId: lnurlWithdrawEntity.lnurlWithdrawId },
    //     data: lnurlWithdrawEntity,
    //   });
    // } else {
    //   lw = await this._db?.lnurlWithdrawEntity.create({
    //     data: lnurlWithdrawEntity,
    //   });
    // }
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

    // .f..findUnique(

    // ).ff manager
    //   .getRepository(LnurlWithdrawEntity)
    //   .findOne({ where: { secretToken } });

    // // We need to instantiate a new Date with expiration:
    // // https://github.com/typeorm/typeorm/issues/4320
    // if (lw) {
    //   if (lw.expiration) lw.expiration = new Date(lw.expiration);
    //   lw.active = ((lw.active as unknown) as number) == 1;
    //   lw.calledback = ((lw.calledback as unknown) as number) == 1;
    //   lw.batchFallback = ((lw.batchFallback as unknown) as number) == 1;
    // }

    return lw as LnurlWithdrawEntity;
  }

  async getLnurlWithdrawByBatchRequestId(
    batchRequestId: number
  ): Promise<LnurlWithdrawEntity> {
    const lw = await this._db?.lnurlWithdrawEntity.findUnique({
      where: { batchRequestId },
    });

    // .manager
    //   .getRepository(LnurlWithdrawEntity)
    //   .findOne({ where: { batchRequestId } });

    // // We need to instantiate a new Date with expiration:
    // // https://github.com/typeorm/typeorm/issues/4320
    // if (lw) {
    //   if (lw.expiration) lw.expiration = new Date(lw.expiration);
    //   lw.active = ((lw.active as unknown) as number) == 1;
    //   lw.calledback = ((lw.calledback as unknown) as number) == 1;
    //   lw.batchFallback = ((lw.batchFallback as unknown) as number) == 1;
    // }

    return lw as LnurlWithdrawEntity;
  }

  async getLnurlWithdraw(
    lnurlWithdrawEntity: LnurlWithdrawEntity
  ): Promise<LnurlWithdrawEntity> {
    const lw = await this._db?.lnurlWithdrawEntity.findUnique({
      where: { lnurlWithdrawId: lnurlWithdrawEntity.lnurlWithdrawId },
    });

    // .manager
    //   .getRepository(LnurlWithdrawEntity)
    //   .findOne(lnurlWithdrawEntity);

    // // We need to instantiate a new Date with expiration:
    // // https://github.com/typeorm/typeorm/issues/4320
    // if (lw) {
    //   if (lw.expiration) lw.expiration = new Date(lw.expiration);
    //   lw.active = ((lw.active as unknown) as number) == 1;
    //   lw.calledback = ((lw.calledback as unknown) as number) == 1;
    //   lw.batchFallback = ((lw.batchFallback as unknown) as number) == 1;
    // }

    return lw as LnurlWithdrawEntity;
  }

  async getLnurlWithdrawById(
    lnurlWithdrawId: number
  ): Promise<LnurlWithdrawEntity> {
    const lw = await this._db?.lnurlWithdrawEntity.findUnique({
      where: { lnurlWithdrawId: lnurlWithdrawId },
    });

    // .manager
    //   .getRepository(LnurlWithdrawEntity)
    //   .findOne(lnurlWithdrawId);

    // // We need to instantiate a new Date with expiration:
    // // https://github.com/typeorm/typeorm/issues/4320
    // if (lw) {
    //   if (lw.expiration) lw.expiration = new Date(lw.expiration);
    //   lw.active = ((lw.active as unknown) as number) == 1;
    //   lw.calledback = ((lw.calledback as unknown) as number) == 1;
    //   lw.batchFallback = ((lw.batchFallback as unknown) as number) == 1;
    // }

    return lw as LnurlWithdrawEntity;
  }

  async getNonCalledbackLnurlWithdraws(): Promise<LnurlWithdrawEntity[]> {
    const lws = await this._db?.lnurlWithdrawEntity.findMany({
      where: {
        deleted: false,
        paid: true,
        calledback: false,
        webhookUrl: { not: null },
        withdrawnDetails: { not: null },
        withdrawnTs: { not: null },
      },
    });
    // const lws = await this._db?.manager
    //   .getRepository(LnurlWithdrawEntity)
    //   .find({
    //     where: {
    //       active: false,
    //       calledback: false,
    //       webhookUrl: Not(IsNull()),
    //       withdrawnDetails: Not(IsNull()),
    //       withdrawnTimestamp: Not(IsNull()),
    //     },
    //   });

    // // We need to instantiate a new Date with expiration:
    // // https://github.com/typeorm/typeorm/issues/4320
    // if (lws && lws.length > 0) {
    //   lws.forEach((lw) => {
    //     if (lw.expiration) lw.expiration = new Date(lw.expiration);
    //     lw.active = ((lw.active as unknown) as number) == 1;
    //     lw.calledback = ((lw.calledback as unknown) as number) == 1;
    //     lw.batchFallback = ((lw.batchFallback as unknown) as number) == 1;
    //   });
    // }

    return lws as LnurlWithdrawEntity[];
    // return lws;
  }

  async getFallbackLnurlWithdraws(): Promise<LnurlWithdrawEntity[]> {
    const lws = await this._db?.lnurlWithdrawEntity.findMany({
      where: {
        deleted: false,
        paid: false,
        expiration: { lt: new Date() },
        fallbackDone: false,
        AND: [
          { NOT: { btcFallbackAddress: null } },
          { NOT: { btcFallbackAddress: "" } },
        ],
      },
    });
    // const lws = await this._db?.manager
    //   .getRepository(LnurlWithdrawEntity)
    //   .find({
    //     where: [
    //       {
    //         active: true,
    //         // expiration: LessThan(Math.round(new Date().valueOf() / 1000)),
    //         expiration: LessThan(new Date().toISOString()),
    //         btcFallbackAddress: Not(IsNull()),
    //       },
    //       {
    //         active: true,
    //         expiration: LessThan(new Date().toISOString()),
    //         btcFallbackAddress: Not(Equal("")),
    //       },
    //     ],
    //     // where: {
    //     //   {
    //     //     active: true,
    //     //     expiration: LessThan(new Date()),
    //     //   },{
    //     //   [
    //     //     { btcFallbackAddress: Not(IsNull()) },
    //     //     { btcFallbackAddress: Not(Equal("")) },
    //     //   ]},
    //     //   }
    //   });

    // // We need to instantiate a new Date with expiration:
    // // https://github.com/typeorm/typeorm/issues/4320
    // if (lws && lws.length > 0) {
    //   lws.forEach((lw) => {
    //     if (lw.expiration) lw.expiration = new Date(lw.expiration);
    //     lw.active = ((lw.active as unknown) as number) == 1;
    //     lw.calledback = ((lw.calledback as unknown) as number) == 1;
    //     lw.batchFallback = ((lw.batchFallback as unknown) as number) == 1;
    //   });
    // }

    return lws as LnurlWithdrawEntity[];
    // return [];
  }
}

export { LnurlDBPrisma as LnurlDB };
