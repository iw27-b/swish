-- CreateEnum
CREATE TYPE "TradeStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'CANCELLED', 'COMPLETED', 'EXPIRED');

-- CreateTable
CREATE TABLE "Trade" (
    "id" TEXT NOT NULL,
    "initiatorId" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "status" "TradeStatus" NOT NULL DEFAULT 'PENDING',
    "message" TEXT,
    "responseMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "Trade_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TradeCard" (
    "id" TEXT NOT NULL,
    "tradeId" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "isOffered" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TradeCard_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Trade_initiatorId_idx" ON "Trade"("initiatorId");

-- CreateIndex
CREATE INDEX "Trade_recipientId_idx" ON "Trade"("recipientId");

-- CreateIndex
CREATE INDEX "Trade_status_idx" ON "Trade"("status");

-- CreateIndex
CREATE INDEX "Trade_createdAt_idx" ON "Trade"("createdAt");

-- CreateIndex
CREATE INDEX "Trade_status_createdAt_idx" ON "Trade"("status", "createdAt");

-- CreateIndex
CREATE INDEX "TradeCard_tradeId_idx" ON "TradeCard"("tradeId");

-- CreateIndex
CREATE INDEX "TradeCard_cardId_idx" ON "TradeCard"("cardId");

-- CreateIndex
CREATE INDEX "TradeCard_tradeId_cardId_key" ON "TradeCard"("tradeId", "cardId");

-- AddForeignKey
ALTER TABLE "Trade" ADD CONSTRAINT "Trade_initiatorId_fkey" FOREIGN KEY ("initiatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trade" ADD CONSTRAINT "Trade_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TradeCard" ADD CONSTRAINT "TradeCard_tradeId_fkey" FOREIGN KEY ("tradeId") REFERENCES "Trade"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TradeCard" ADD CONSTRAINT "TradeCard_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
