#!/bin/sh
# railway-build.sh
# Railway build script for Ghostfolio
# Ensures the main branch is used for Ghostfolio and the ghostfolio-main
# branch is used for the ghostfolio-agent submodule.

set -e

GHOSTFOLIO_BRANCH="main"
AGENT_SUBMODULE="ghostfolio-agent"
AGENT_BRANCH="ghostfolio-main"

echo "=== Ghostfolio Railway Build ==="

# ---------------------------------------------------------------------------
# 1. Validate / report the current Ghostfolio branch
# ---------------------------------------------------------------------------
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")
echo "Ghostfolio branch: $CURRENT_BRANCH (expected: $GHOSTFOLIO_BRANCH)"

if [ "$CURRENT_BRANCH" != "$GHOSTFOLIO_BRANCH" ]; then
  echo "WARNING: Current branch is '$CURRENT_BRANCH', expected '$GHOSTFOLIO_BRANCH'."
  echo "Railway should be configured to deploy from the '$GHOSTFOLIO_BRANCH' branch."
fi

# ---------------------------------------------------------------------------
# 2. Initialize and update the ghostfolio-agent submodule
# ---------------------------------------------------------------------------
echo "Initializing submodule: $AGENT_SUBMODULE ..."
git submodule init "$AGENT_SUBMODULE"
git submodule update --remote --checkout "$AGENT_SUBMODULE"

# Ensure the submodule is on the correct branch
cd "$AGENT_SUBMODULE"
echo "Checking out $AGENT_BRANCH for $AGENT_SUBMODULE ..."
git fetch origin "$AGENT_BRANCH"
git checkout "$AGENT_BRANCH"
git pull origin "$AGENT_BRANCH"
cd ..

echo "$AGENT_SUBMODULE is on branch: $(cd "$AGENT_SUBMODULE" && git rev-parse --abbrev-ref HEAD)"

# ---------------------------------------------------------------------------
# 3. Install dependencies and build
# ---------------------------------------------------------------------------
echo "Installing dependencies ..."
npm ci

echo "Building Ghostfolio for production ..."
npm run build:production

echo "=== Build complete ==="
