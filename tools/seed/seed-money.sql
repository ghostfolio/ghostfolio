DO $$
DECLARE
  v_user_id TEXT;
  v_core_account_id TEXT;
  v_income_account_id TEXT;
BEGIN
  SELECT "id" INTO v_user_id
  FROM "User"
  ORDER BY "createdAt" ASC
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'No users found in User table';
  END IF;

  INSERT INTO "Account" ("id", "userId", "name", "currency", "balance", "isExcluded", "createdAt", "updatedAt")
  SELECT
    '7bd6d9ad-f711-4db5-8905-98674f79a201',
    v_user_id,
    'MVP Portfolio',
    'USD',
    0,
    false,
    NOW(),
    NOW()
  WHERE NOT EXISTS (
    SELECT 1 FROM "Account" WHERE "userId" = v_user_id AND "name" = 'MVP Portfolio'
  );

  INSERT INTO "Account" ("id", "userId", "name", "currency", "balance", "isExcluded", "createdAt", "updatedAt")
  SELECT
    'b4f0ce39-ec8b-4db4-9bc1-e0a21198fe02',
    v_user_id,
    'Income Portfolio',
    'USD',
    0,
    false,
    NOW(),
    NOW()
  WHERE NOT EXISTS (
    SELECT 1 FROM "Account" WHERE "userId" = v_user_id AND "name" = 'Income Portfolio'
  );

  SELECT "id" INTO v_core_account_id
  FROM "Account"
  WHERE "userId" = v_user_id AND "name" = 'MVP Portfolio'
  ORDER BY "createdAt" ASC
  LIMIT 1;

  SELECT "id" INTO v_income_account_id
  FROM "Account"
  WHERE "userId" = v_user_id AND "name" = 'Income Portfolio'
  ORDER BY "createdAt" ASC
  LIMIT 1;

  INSERT INTO "SymbolProfile" (
    "id", "symbol", "dataSource", "currency", "isActive", "name", "assetClass", "assetSubClass", "createdAt", "updatedAt"
  )
  VALUES
    ('d0e56e53-d6f0-4cbc-ad49-979252abf001', 'AAPL', 'YAHOO', 'USD', true, 'Apple Inc.', 'EQUITY', 'STOCK', NOW(), NOW()),
    ('d0e56e53-d6f0-4cbc-ad49-979252abf002', 'MSFT', 'YAHOO', 'USD', true, 'Microsoft Corporation', 'EQUITY', 'STOCK', NOW(), NOW()),
    ('d0e56e53-d6f0-4cbc-ad49-979252abf003', 'VTI', 'YAHOO', 'USD', true, 'Vanguard Total Stock Market ETF', 'EQUITY', 'ETF', NOW(), NOW()),
    ('d0e56e53-d6f0-4cbc-ad49-979252abf004', 'SCHD', 'YAHOO', 'USD', true, 'Schwab U.S. Dividend Equity ETF', 'EQUITY', 'ETF', NOW(), NOW())
  ON CONFLICT ("dataSource", "symbol")
  DO UPDATE SET
    "name" = EXCLUDED."name",
    "currency" = 'USD',
    "isActive" = true,
    "assetClass" = EXCLUDED."assetClass",
    "assetSubClass" = EXCLUDED."assetSubClass",
    "updatedAt" = NOW();

  INSERT INTO "Order" ("id", "userId", "accountId", "accountUserId", "symbolProfileId", "currency", "date", "fee", "quantity", "type", "unitPrice", "comment", "isDraft", "createdAt", "updatedAt")
  SELECT '60035d49-f388-49e5-9f10-67e5d7e4a001', v_user_id, v_core_account_id, v_user_id, s."id", 'USD', '2024-01-15T00:00:00.000Z'::timestamptz, 1, 8, 'BUY'::"Type", 186.2, 'railway-seed:mvp-aapl-buy-20240115', false, NOW(), NOW()
  FROM "SymbolProfile" s
  WHERE s."dataSource" = 'YAHOO'::"DataSource" AND s."symbol" = 'AAPL'
    AND NOT EXISTS (SELECT 1 FROM "Order" o WHERE o."userId" = v_user_id AND o."comment" = 'railway-seed:mvp-aapl-buy-20240115');

  INSERT INTO "Order" ("id", "userId", "accountId", "accountUserId", "symbolProfileId", "currency", "date", "fee", "quantity", "type", "unitPrice", "comment", "isDraft", "createdAt", "updatedAt")
  SELECT '60035d49-f388-49e5-9f10-67e5d7e4a002', v_user_id, v_core_account_id, v_user_id, s."id", 'USD', '2024-03-01T00:00:00.000Z'::timestamptz, 1, 5, 'BUY'::"Type", 410.5, 'railway-seed:mvp-msft-buy-20240301', false, NOW(), NOW()
  FROM "SymbolProfile" s
  WHERE s."dataSource" = 'YAHOO'::"DataSource" AND s."symbol" = 'MSFT'
    AND NOT EXISTS (SELECT 1 FROM "Order" o WHERE o."userId" = v_user_id AND o."comment" = 'railway-seed:mvp-msft-buy-20240301');

  INSERT INTO "Order" ("id", "userId", "accountId", "accountUserId", "symbolProfileId", "currency", "date", "fee", "quantity", "type", "unitPrice", "comment", "isDraft", "createdAt", "updatedAt")
  SELECT '60035d49-f388-49e5-9f10-67e5d7e4a003', v_user_id, v_income_account_id, v_user_id, s."id", 'USD', '2024-02-01T00:00:00.000Z'::timestamptz, 1, 12, 'BUY'::"Type", 242.3, 'railway-seed:income-vti-buy-20240201', false, NOW(), NOW()
  FROM "SymbolProfile" s
  WHERE s."dataSource" = 'YAHOO'::"DataSource" AND s."symbol" = 'VTI'
    AND NOT EXISTS (SELECT 1 FROM "Order" o WHERE o."userId" = v_user_id AND o."comment" = 'railway-seed:income-vti-buy-20240201');

  INSERT INTO "Order" ("id", "userId", "accountId", "accountUserId", "symbolProfileId", "currency", "date", "fee", "quantity", "type", "unitPrice", "comment", "isDraft", "createdAt", "updatedAt")
  SELECT '60035d49-f388-49e5-9f10-67e5d7e4a004', v_user_id, v_income_account_id, v_user_id, s."id", 'USD', '2024-03-18T00:00:00.000Z'::timestamptz, 1, 16, 'BUY'::"Type", 77.85, 'railway-seed:income-schd-buy-20240318', false, NOW(), NOW()
  FROM "SymbolProfile" s
  WHERE s."dataSource" = 'YAHOO'::"DataSource" AND s."symbol" = 'SCHD'
    AND NOT EXISTS (SELECT 1 FROM "Order" o WHERE o."userId" = v_user_id AND o."comment" = 'railway-seed:income-schd-buy-20240318');

  INSERT INTO "Order" ("id", "userId", "accountId", "accountUserId", "symbolProfileId", "currency", "date", "fee", "quantity", "type", "unitPrice", "comment", "isDraft", "createdAt", "updatedAt")
  SELECT '60035d49-f388-49e5-9f10-67e5d7e4a005', v_user_id, v_income_account_id, v_user_id, s."id", 'USD', '2024-12-04T00:00:00.000Z'::timestamptz, 1, 4, 'SELL'::"Type", 80.95, 'railway-seed:income-schd-sell-20241204', false, NOW(), NOW()
  FROM "SymbolProfile" s
  WHERE s."dataSource" = 'YAHOO'::"DataSource" AND s."symbol" = 'SCHD'
    AND NOT EXISTS (SELECT 1 FROM "Order" o WHERE o."userId" = v_user_id AND o."comment" = 'railway-seed:income-schd-sell-20241204');
END
$$;

SELECT count(*) AS users FROM "User";
SELECT count(*) AS accounts FROM "Account";
SELECT count(*) AS orders FROM "Order";
SELECT count(*) AS railway_seed_orders FROM "Order" WHERE "comment" LIKE 'railway-seed:%';
