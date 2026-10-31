-- Remove redundant currency from the 'Order' table
UPDATE "Order"
SET "currency" = NULL
FROM "SymbolProfile"
WHERE "Order"."symbolProfileId" = "SymbolProfile"."id" AND "Order"."currency" = "SymbolProfile"."currency";
