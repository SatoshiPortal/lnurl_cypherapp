-- CreateTable
CREATE TABLE "LnurlWithdrawEntity" (
    "lnurlWithdrawId" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "externalId" TEXT,
    "msatoshi" INTEGER NOT NULL,
    "description" TEXT,
    "expiresAt" DATETIME,
    "secretToken" TEXT NOT NULL,
    "webhookUrl" TEXT,
    "paidCalledback" BOOLEAN NOT NULL DEFAULT false,
    "paidCalledbackTs" DATETIME,
    "batchedCalledback" BOOLEAN NOT NULL DEFAULT false,
    "batchedCalledbackTs" DATETIME,
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

-- CreateIndex
CREATE UNIQUE INDEX "LnurlWithdrawEntity.secretToken_unique" ON "LnurlWithdrawEntity"("secretToken");

-- CreateIndex
CREATE UNIQUE INDEX "LnurlWithdrawEntity.batchRequestId_unique" ON "LnurlWithdrawEntity"("batchRequestId");

-- CreateIndex
CREATE INDEX "LnurlWithdrawEntity.externalId_index" ON "LnurlWithdrawEntity"("externalId");

-- CreateIndex
CREATE INDEX "LnurlWithdrawEntity.bolt11_index" ON "LnurlWithdrawEntity"("bolt11");

-- CreateIndex
CREATE INDEX "LnurlWithdrawEntity.btcFallbackAddress_index" ON "LnurlWithdrawEntity"("btcFallbackAddress");
