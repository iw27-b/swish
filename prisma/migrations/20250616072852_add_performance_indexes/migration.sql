-- CreateIndex
CREATE INDEX "Card_player_idx" ON "Card"("player");

-- CreateIndex
CREATE INDEX "Card_team_idx" ON "Card"("team");

-- CreateIndex
CREATE INDEX "Card_brand_idx" ON "Card"("brand");

-- CreateIndex
CREATE INDEX "Card_ownerId_idx" ON "Card"("ownerId");

-- CreateIndex
CREATE INDEX "Card_isForSale_price_idx" ON "Card"("isForSale", "price");

-- CreateIndex
CREATE INDEX "Card_isForTrade_idx" ON "Card"("isForTrade");

-- CreateIndex
CREATE INDEX "Card_createdAt_idx" ON "Card"("createdAt");

-- CreateIndex
CREATE INDEX "Card_year_brand_idx" ON "Card"("year", "brand");

-- CreateIndex
CREATE INDEX "Card_player_team_year_idx" ON "Card"("player", "team", "year");

-- CreateIndex
CREATE INDEX "Purchase_createdAt_idx" ON "Purchase"("createdAt");

-- CreateIndex
CREATE INDEX "Purchase_buyerId_createdAt_idx" ON "Purchase"("buyerId", "createdAt");

-- CreateIndex
CREATE INDEX "Purchase_sellerId_createdAt_idx" ON "Purchase"("sellerId", "createdAt");

-- CreateIndex
CREATE INDEX "Purchase_status_createdAt_idx" ON "Purchase"("status", "createdAt");
