-- Create the "DRAFT" tag if it does not exist yet
INSERT INTO "Tag" ("id", "name")
VALUES ('0c077abd-eca2-4cbb-818c-6cefbf2d169a', 'DRAFT')
ON CONFLICT DO NOTHING;

-- Migrate activities with "isDraft" to the "DRAFT" tag
INSERT INTO "_OrderToTag" ("A", "B")
SELECT
  "id",
  '0c077abd-eca2-4cbb-818c-6cefbf2d169a'
FROM "Order"
WHERE "isDraft" = true
ON CONFLICT DO NOTHING;
