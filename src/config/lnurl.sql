CREATE TABLE IF NOT EXISTS "LnurlWithdrawEntity" (
    "lnurlWithdrawId" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "externalId" TEXT,
    "msatoshi" INTEGER NOT NULL,
    "description" TEXT,
    "expiration" DATETIME,
    "secretToken" TEXT NOT NULL,
    "webhookUrl" TEXT,
    "calledback" BOOLEAN NOT NULL DEFAULT false,
    "calledbackTs" DATETIME,
    "lnurl" TEXT NOT NULL,
    "bolt11" TEXT,
    "btcFallbackAddress" TEXT,
    "batchFallback" BOOLEAN NOT NULL DEFAULT false,
    "batchRequestId" INTEGER,
    "fallbackDone" BOOLEAN NOT NULL DEFAULT false,
    "withdrawnDetails" TEXT,
    "withdrawnTs" DATETIME,
    "paid" BOOLEAN NOT NULL DEFAULT false,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "createdTs" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedTs" DATETIME NOT NULL
);
CREATE UNIQUE INDEX "LnurlWithdrawEntity.secretToken_unique" ON "LnurlWithdrawEntity"("secretToken");
CREATE UNIQUE INDEX "LnurlWithdrawEntity.batchRequestId_unique" ON "LnurlWithdrawEntity"("batchRequestId");
CREATE INDEX "LnurlWithdrawEntity.externalId_index" ON "LnurlWithdrawEntity"("externalId");
CREATE INDEX "LnurlWithdrawEntity.bolt11_index" ON "LnurlWithdrawEntity"("bolt11");
CREATE INDEX "LnurlWithdrawEntity.btcFallbackAddress_index" ON "LnurlWithdrawEntity"("btcFallbackAddress");
