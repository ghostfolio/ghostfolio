-- Grant the scope to update an account to the existing accesses of the model context protocol which can create an activity
UPDATE "Access"
SET "scopes" = array_append("scopes", 'account:update')
WHERE "type" = 'MCP'
  AND 'activity:create' = ANY("scopes")
  AND NOT ('account:update' = ANY("scopes"));
