UPDATE "SymbolProfile"
SET "assetClass" = 'LIQUIDITY'
WHERE "assetClass" = 'CASH';

UPDATE "SymbolProfileOverrides"
SET "assetClass" = 'LIQUIDITY'
WHERE "assetClass" = 'CASH';
