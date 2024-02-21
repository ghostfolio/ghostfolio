-- CreateIndex
CREATE INDEX "Access_granteeUserId_idx" ON "Access"("granteeUserId");

-- CreateIndex
CREATE INDEX "Access_userId_idx" ON "Access"("userId");

-- CreateIndex
CREATE INDEX "Account_currency_idx" ON "Account"("currency");

-- CreateIndex
CREATE INDEX "Account_userId_idx" ON "Account"("userId");

-- CreateIndex
CREATE INDEX "AccountBalance_accountId_idx" ON "AccountBalance"("accountId");

-- CreateIndex
CREATE INDEX "AuthDevice_userId_idx" ON "AuthDevice"("userId");

-- CreateIndex
CREATE INDEX "MarketData_state_idx" ON "MarketData"("state");

-- CreateIndex
CREATE INDEX "Order_isDraft_idx" ON "Order"("isDraft");

-- CreateIndex
CREATE INDEX "Order_userId_idx" ON "Order"("userId");

-- CreateIndex
CREATE INDEX "Subscription_userId_idx" ON "Subscription"("userId");

-- CreateIndex
CREATE INDEX "SymbolProfile_assetClass_idx" ON "SymbolProfile"("assetClass");

-- CreateIndex
CREATE INDEX "SymbolProfile_dataSource_idx" ON "SymbolProfile"("dataSource");

-- CreateIndex
CREATE INDEX "SymbolProfile_isin_idx" ON "SymbolProfile"("isin");

-- CreateIndex
CREATE INDEX "SymbolProfile_name_idx" ON "SymbolProfile"("name");

-- CreateIndex
CREATE INDEX "SymbolProfile_symbol_idx" ON "SymbolProfile"("symbol");

-- CreateIndex
CREATE INDEX "User_accessToken_idx" ON "User"("accessToken");

-- CreateIndex
CREATE INDEX "User_createdAt_idx" ON "User"("createdAt");

-- CreateIndex
CREATE INDEX "User_provider_idx" ON "User"("provider");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE INDEX "User_thirdPartyId_idx" ON "User"("thirdPartyId");
