#!/bin/sh
# Runs in the pse-sync container. Updates PSE closing prices in Ghostfolio's
# database when the container starts, then daily while it keeps running.
# Assets are matched by name because the MANUAL data source identifies them by
# a generated UUID. To add a ticker, add "TICKER:cmpy_id" below (the number after
# "cmpy_id=" on edge.pse.com.ph); the ticker must match the asset's name in Ghostfolio.

COMPANIES="AC:57 AREIT:679 CNPF:652 CNVRG:680 CREIT:691 DDMPR:681 DNL:639 FILRT:683
JFC:86 MBT:128 MER:118 MONDE:682 OGP:704 PGOLD:629 RCR:684 SGP:166 SMC:154 URC:124
AEV:16 ALI:180 LTG:12 MREIT:685 RLC:195"

# Every update covers this date up to today. A ticker fails, and nothing is written
# for it, if its data doesn't reach back to LATEST_FIRST_DAY (allows for market holidays).
HISTORY_START=07-01-2026
LATEST_FIRST_DAY=20260703

UA="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36"
TO_SQL_VALUES='[.chartData[] | "(\($q)\(.CHART_DATE | strptime("%b %d, %Y %H:%M:%S") | strftime("%Y-%m-%d"))\($q),\(.CLOSE | tonumber))"] | unique_by(.[0:13]) | join(",")'
export PGPASSWORD="$POSTGRES_PASSWORD"
export REDISCLI_AUTH="$REDIS_PASSWORD"

sync_ticker() {
  symbol=$1
  cmpy_id=$2
  page_url="https://edge.pse.com.ph/companyPage/stockData.do?cmpy_id=$cmpy_id"
  jar=/tmp/cookies

  # Open the Stock Data page first (gets a session cookie and the security_id).
  page=$(curl -fsS --max-time 60 -A "$UA" -c "$jar" "$page_url" | tr -d '\r\n') || return 1
  options=$(echo "$page" | grep -oE '<option[^>]*value="[0-9]+"[^>]*>[[:space:]]*[^<]+' |
    sed -E 's/.*value="([0-9]+)"[^>]*>[[:space:]]*/\1 /')
  security_id=$(echo "$options" | awk -v s="$symbol" '$2 == s { print $1; exit }')
  [ -n "$security_id" ] || security_id=$(echo "$options" | awk 'NR == 1 { print $1 }')
  [ -n "$security_id" ] || { echo "no security_id found"; return 1; }

  end=$(date +%m-%d-%Y)
  values=$(curl -fsS --max-time 60 -A "$UA" -b "$jar" -H "Content-Type: application/json" \
    -H "X-Requested-With: XMLHttpRequest" -H "Referer: $page_url" -H "Origin: https://edge.pse.com.ph" \
    -d "{\"cmpy_id\":\"$cmpy_id\",\"security_id\":\"$security_id\",\"startDate\":\"$HISTORY_START\",\"endDate\":\"$end\"}" \
    https://edge.pse.com.ph/common/DisclosureCht.ax |
    jq -r --arg q "'" "$TO_SQL_VALUES") || return 1
  [ -n "$values" ] || { echo "no price data returned"; return 1; }
  first=$(echo "$values" | cut -c3-12 | tr -d -)
  [ "$first" -le "$LATEST_FIRST_DAY" ] || { echo "$symbol history starts at $first, too late"; return 1; }
  count=$(echo "$values" | grep -o "),(" | wc -l)
  count=$((count + 1))

  sql="INSERT INTO \"MarketData\" (id, \"dataSource\", symbol, date, \"marketPrice\", state)
SELECT gen_random_uuid()::text, a.\"dataSource\", a.symbol, v.d::timestamp, v.price::double precision, 'CLOSE'
FROM (VALUES $values) AS v(d, price)
JOIN \"SymbolProfile\" a ON a.name = '$symbol' AND a.\"dataSource\" = 'MANUAL'
ON CONFLICT (\"dataSource\", symbol, date) DO UPDATE
SET \"marketPrice\" = EXCLUDED.\"marketPrice\", state = EXCLUDED.state;"
  result=$(echo "$sql" | psql -h postgres -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1) || return 1
  [ "$result" = "INSERT 0 $count" ] || { echo "expected $count rows, database said: $result"; return 1; }
  echo "OK    $symbol  $count days"
}

sync_all() {
  failed=0
  for company in $COMPANIES; do
    symbol=${company%:*}
    sync_ticker "$symbol" "${company#*:}" || { echo "FAIL  $symbol"; failed=$((failed + 1)); }
    sleep 2 # be polite to the PSE server
  done

  # Drop cached portfolio calculations so the next page load uses the new prices.
  redis-cli -h redis --scan --pattern 'portfolio-snapshot-*' | xargs -r redis-cli -h redis del >/dev/null

  echo "$(date) Done with $failed failure(s)."
  [ "$failed" -eq 0 ]
}

until apk add --quiet --no-cache curl jq redis; do sleep 30; done
until pg_isready --quiet -h postgres; do sleep 5; done

while true; do
  now=$(date +%s)
  if sync_all; then
    # Next 18:30 Manila time (10:30 UTC). Short sleeps so a laptop's sleep can't delay it much.
    next=$((now / 86400 * 86400 + 37800))
    [ "$next" -gt "$now" ] || next=$((next + 86400))
  else
    next=$((now + 3600))
  fi
  while [ "$(date +%s)" -lt "$next" ]; do sleep 300; done
done
