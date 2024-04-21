-- Only keep the newest AccountBalance entry for each account / day
WITH entries_to_keep AS (
  SELECT
    id,
    "accountId",
    date,
    ROW_NUMBER() OVER (PARTITION BY "accountId", DATE(date) ORDER BY date DESC) AS row_num
  FROM
    "AccountBalance"
),
entries_to_delete AS (
  SELECT
    id
  FROM
    entries_to_keep
  WHERE
    row_num > 1
)
DELETE FROM
  "AccountBalance"
WHERE
  id IN (SELECT id FROM entries_to_delete);

-- Reset time part of the date
UPDATE "AccountBalance"
SET date = DATE_TRUNC('day', date);

-- CreateIndex
CREATE UNIQUE INDEX "AccountBalance_accountId_date_key" ON "AccountBalance"("accountId", "date");
