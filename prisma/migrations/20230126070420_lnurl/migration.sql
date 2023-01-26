-- CreateTable
CREATE TABLE "LnurlPayEntity" (
    "lnurlPayId" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "externalId" TEXT NOT NULL,
    "minMsatoshi" INTEGER NOT NULL DEFAULT 1,
    "maxMsatoshi" INTEGER NOT NULL DEFAULT 1,
    "description" TEXT,
    "webhookUrl" TEXT,
    "lnurl" TEXT NOT NULL,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "createdTs" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedTs" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "LnurlPayRequestEntity" (
    "lnurlPayRequestId" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "lnurlPayEntityId" INTEGER NOT NULL,
    "bolt11Label" TEXT NOT NULL,
    "msatoshi" INTEGER NOT NULL,
    "bolt11" TEXT,
    "metadata" TEXT,
    "paid" BOOLEAN NOT NULL DEFAULT false,
    "paidCalledbackTs" DATETIME,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "createdTs" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedTs" DATETIME NOT NULL,
    FOREIGN KEY ("lnurlPayEntityId") REFERENCES "LnurlPayEntity" ("lnurlPayId") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "LnurlPayEntity.externalId_unique" ON "LnurlPayEntity"("externalId");

-- CreateIndex
CREATE INDEX "LnurlPayEntity.externalId_index" ON "LnurlPayEntity"("externalId");

-- CreateIndex
CREATE UNIQUE INDEX "LnurlPayRequestEntity.bolt11Label_unique" ON "LnurlPayRequestEntity"("bolt11Label");

-- CreateIndex
CREATE INDEX "LnurlPayRequestEntity.bolt11_index" ON "LnurlPayRequestEntity"("bolt11");
