-- AddColumn: modelId to AgentChatLog
ALTER TABLE "AgentChatLog" ADD COLUMN "modelId" TEXT;

-- ============================================================
-- Fix non-UUID SymbolProfile IDs (sp-* → proper UUIDs)
-- All FK constraints use ON UPDATE CASCADE, so Order.symbolProfileId
-- and other references update automatically.
-- ============================================================
UPDATE "SymbolProfile" SET "id" = 'd8f0b8c3-212c-48ef-a837-fff75ef98176' WHERE "id" = 'sp-aapl';
UPDATE "SymbolProfile" SET "id" = '5bb696ab-aaf3-4924-a0e4-79c69bfcd81b' WHERE "id" = 'sp-msft';
UPDATE "SymbolProfile" SET "id" = '7df6544c-c592-459c-af69-aafe65db60c9' WHERE "id" = 'sp-voo';
UPDATE "SymbolProfile" SET "id" = 'ba75d50e-34f6-4c9e-bbb7-71b43b7cbfc0' WHERE "id" = 'sp-googl';
UPDATE "SymbolProfile" SET "id" = '8b846370-2e16-4594-9785-a94da15d60a1' WHERE "id" = 'sp-btc';

-- ============================================================
-- Delete test user with non-RFC4122 UUID (aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee)
-- All FK constraints use ON DELETE CASCADE, so their orders (ord-*),
-- account (11111111-2222-3333-4444-555555555555), etc. are cleaned up automatically.
-- The seed will recreate the demo user with proper UUIDs on next run.
-- ============================================================
DELETE FROM "User" WHERE "id" = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
