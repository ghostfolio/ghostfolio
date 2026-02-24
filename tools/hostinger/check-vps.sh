#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${HOSTINGER_API_KEY:-}" ]]; then
  echo "HOSTINGER_API_KEY is missing"
  exit 1
fi

tmp_file="$(mktemp)"
status_code="$(curl -sS -o "${tmp_file}" -w "%{http_code}" \
  -H "Authorization: Bearer ${HOSTINGER_API_KEY}" \
  "https://developers.hostinger.com/api/vps/v1/virtual-machines")"

if [[ "${status_code}" != "200" ]]; then
  echo "Hostinger API check failed (status ${status_code})"
  cat "${tmp_file}"
  rm -f "${tmp_file}"
  exit 1
fi

node -e '
  const fs = require("fs");
  const filePath = process.argv[1];
  const payload = JSON.parse(fs.readFileSync(filePath, "utf8"));
  if (!Array.isArray(payload)) {
    console.log("Hostinger payload is not an array");
    process.exit(1);
  }
  const running = payload.filter((item) => item.state === "running");
  const summary = {
    runningCount: running.length,
    totalCount: payload.length,
    vps: payload.map((item) => ({
      id: item.id,
      plan: item.plan,
      state: item.state,
      hostname: item.hostname
    }))
  };
  console.log(JSON.stringify(summary, null, 2));
' "${tmp_file}"

rm -f "${tmp_file}"
