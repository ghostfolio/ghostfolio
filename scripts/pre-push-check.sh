#!/bin/bash

set -e

echo "========================================"
echo "PRE-PUSH SAFETY CHECK"
echo "========================================"
echo ""

# Check branch
BRANCH=$(git branch --show-current)
echo "Current branch: $BRANCH"

if [ "$BRANCH" = "main" ]; then
  echo "⚠️  WARNING: Pushing directly to main"
  read -p "Continue? (y/n) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Aborted. Create a feature branch instead."
    exit 1
  fi
fi

echo ""
echo "========================================"
echo "1. Running AI Tests..."
echo "========================================"
if pnpm test:ai; then
  echo "✅ AI tests passed"
else
  echo "❌ AI tests FAILED - aborting push"
  exit 1
fi

echo ""
echo "========================================"
echo "2. Running MVP Evals..."
echo "========================================"
if pnpm test:mvp-eval; then
  echo "✅ MVP evals passed"
else
  echo "❌ MVP evals FAILED - aborting push"
  exit 1
fi

echo ""
echo "========================================"
echo "3. Checking Build..."
echo "========================================"
if pnpm build; then
  echo "✅ Build succeeded"
else
  echo "❌ Build FAILED - aborting push"
  exit 1
fi

echo ""
echo "========================================"
echo "4. Reviewing Changes..."
echo "========================================"
git status --short

echo ""
MODIFIED=$(git diff --name-only | wc -l | tr -d ' ')
NEW=$(git ls-files --others --exclude-standard | wc -l | tr -d ' ')
echo "Modified files: $MODIFIED"
echo "New files: $NEW"

echo ""
read -p "Review changes above. Continue with push? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "Aborted."
  exit 1
fi

echo ""
echo "========================================"
echo "✅ ALL CHECKS PASSED"
echo "========================================"
echo ""
echo "Safe to push:"
echo "  git push origin $BRANCH"
echo ""
