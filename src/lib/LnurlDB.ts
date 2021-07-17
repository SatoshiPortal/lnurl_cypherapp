import logger from "./Log2File";
import path from "path";
import LnurlConfig from "../config/LnurlConfig";
import { Connection, createConnection } from "typeorm";
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
    const lwr = await this._db?.manager
      .getRepository(LnurlWithdrawEntity)
      .save(lnurlWithdraw);

    return lwr as LnurlWithdrawEntity;
  }

  async getLnurlWithdrawBySecret(
    secretToken: string
  ): Promise<LnurlWithdrawEntity> {
    const wr = await this._db?.manager
      .getRepository(LnurlWithdrawEntity)
      .findOne({ where: { secretToken } });

    return wr as LnurlWithdrawEntity;
  }
}

export { LnurlDB };
