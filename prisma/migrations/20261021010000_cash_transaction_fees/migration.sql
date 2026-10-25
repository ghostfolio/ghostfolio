ALTER TABLE "CashEvent" ADD COLUMN "fee" DECIMAL(65,30) NOT NULL DEFAULT 0;
ALTER TABLE "CashEvent" ADD CONSTRAINT "CashEvent_fee_check" CHECK ("fee" >= 0 AND ("type" <> 'CHECKPOINT' OR "fee" = 0));
