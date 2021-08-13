import logger from "./Log2File";
import path from "path";
import LnurlConfig from "../config/LnurlConfig";
import { Connection, createConnection, IsNull, Not } from "typeorm";
import { LnurlWithdrawEntity } from "../entity/LnurlWithdrawEntity";

class LnurlDB {
  private _db?: Connection;

  constructor(lnurlConfig: LnurlConfig) {
    this.configureDB(lnurlConfig);
  }

  async configureDB(lnurlConfig: LnurlConfig): Promise<void> {
    logger.info("LnurlDB.configureDB", lnurlConfig);

    if (this._db?.isConnected) {
      await this._db.close();
    }
    this._db = await this.initDatabase(
      path.resolve(
        lnurlConfig.BASE_DIR,
        lnurlConfig.DATA_DIR,
        lnurlConfig.DB_NAME
      )
    );
  }

  async initDatabase(dbName: string): Promise<Connection> {
    logger.info("LnurlDB.initDatabase", dbName);

    return await createConnection({
      type: "sqlite",
      database: dbName,
      entities: [LnurlWithdrawEntity],
      synchronize: true,
      logging: true,
    });
  }

  async saveLnurlWithdraw(
    lnurlWithdraw: LnurlWithdrawEntity
  ): Promise<LnurlWithdrawEntity> {
    const lw = await this._db?.manager
      .getRepository(LnurlWithdrawEntity)
      .save(lnurlWithdraw);

    // We need to instantiate a new Date with expiration:
    // https://github.com/typeorm/typeorm/issues/4320
    if (lw) {
      if (lw.expiration) lw.expiration = new Date(lw.expiration);
      lw.active = ((lw.active as unknown) as number) == 1;
      lw.calledback = ((lw.calledback as unknown) as number) == 1;
    }

    return lw as LnurlWithdrawEntity;
  }

  async getLnurlWithdrawBySecret(
    secretToken: string
  ): Promise<LnurlWithdrawEntity> {
    const lw = await this._db?.manager
      .getRepository(LnurlWithdrawEntity)
      .findOne({ where: { secretToken } });

    // We need to instantiate a new Date with expiration:
    // https://github.com/typeorm/typeorm/issues/4320
    if (lw) {
      if (lw.expiration) lw.expiration = new Date(lw.expiration);
      lw.active = ((lw.active as unknown) as number) == 1;
      lw.calledback = ((lw.calledback as unknown) as number) == 1;
    }

    return lw as LnurlWithdrawEntity;
  }

  async getLnurlWithdraw(
    lnurlWithdrawEntity: LnurlWithdrawEntity
  ): Promise<LnurlWithdrawEntity> {
    const lw = await this._db?.manager
      .getRepository(LnurlWithdrawEntity)
      .findOne(lnurlWithdrawEntity);

    // We need to instantiate a new Date with expiration:
    // https://github.com/typeorm/typeorm/issues/4320
    if (lw) {
      if (lw.expiration) lw.expiration = new Date(lw.expiration);
      lw.active = ((lw.active as unknown) as number) == 1;
      lw.calledback = ((lw.calledback as unknown) as number) == 1;
    }

    return lw as LnurlWithdrawEntity;
  }

  async getLnurlWithdrawById(
    lnurlWithdrawId: number
  ): Promise<LnurlWithdrawEntity> {
    const lw = await this._db?.manager
      .getRepository(LnurlWithdrawEntity)
      .findOne(lnurlWithdrawId);

    // We need to instantiate a new Date with expiration:
    // https://github.com/typeorm/typeorm/issues/4320
    if (lw) {
      if (lw.expiration) lw.expiration = new Date(lw.expiration);
      lw.active = ((lw.active as unknown) as number) == 1;
      lw.calledback = ((lw.calledback as unknown) as number) == 1;
    }

    return lw as LnurlWithdrawEntity;
  }

  async getNonCalledbackLnurlWithdraws(): Promise<LnurlWithdrawEntity[]> {
    const lws = await this._db?.manager
      .getRepository(LnurlWithdrawEntity)
      .find({
        where: {
          active: false,
          calledback: false,
          webhookUrl: Not(IsNull()),
          withdrawnDetails: Not(IsNull()),
          withdrawnTimestamp: Not(IsNull()),
        },
      });

    // We need to instantiate a new Date with expiration:
    // https://github.com/typeorm/typeorm/issues/4320
    if (lws && lws.length > 0) {
      lws.forEach((lw) => {
        if (lw.expiration) lw.expiration = new Date(lw.expiration);
        lw.active = ((lw.active as unknown) as number) == 1;
        lw.calledback = ((lw.calledback as unknown) as number) == 1;
      });
    }

    return lws as LnurlWithdrawEntity[];
  }
}

export { LnurlDB };
