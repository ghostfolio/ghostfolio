#!/usr/bin/env bash

set -eoux pipefail

git fetch --all
git checkout main
git pull origin
git checkout feat/moex-service
git rebase main
git checkout --ours package-lock.json package.json && git add package-lock.json package.json
npm add moex-iss-api-client
git add package-lock.json package.json
git rebase --continue
