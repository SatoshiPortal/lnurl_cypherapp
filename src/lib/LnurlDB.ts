import logger from "./Log2File";
import path from "path";
import LnurlConfig from "../config/LnurlConfig";
import { Connection, createConnection, IsNull } from "typeorm";
import { LnurlWithdrawRequest } from "../entity/LnurlWithdrawRequest";

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
      entities: [LnurlWithdrawRequest],
      synchronize: true,
      logging: true,
    });
  }

  async saveLnurlWithdrawRequest(lnurlWithdrawRequest: LnurlWithdrawRequest): Promise<LnurlWithdrawRequest> {
    const lwr = await this._db?.manager.getRepository(LnurlWithdrawRequest).save(lnurlWithdrawRequest);

    return lwr as LnurlWithdrawRequest;
  }

  async getLnurlWithdrawRequestBySecret(secretToken: string): Promise<LnurlWithdrawRequest> {
    const wr = await this._db?.manager
      .getRepository(LnurlWithdrawRequest)
      .findOne({ where: { secretToken } });

    return wr as LnurlWithdrawRequest;
  }

}

export { LnurlDB };
