#!/usr/bin/env bash
#
# Deploy StoneQR to Cloudflare Pages as static assets.
# Builds apps/site with adapter-static, then uploads ./apps/site/build.
#
# Usage:
#   ./deploy.sh              # build and deploy to production
#   ./deploy.sh --dry-run    # build and list the output, no upload
#
# Requires: bun, wrangler (npx wrangler), already authenticated (`npx wrangler whoami`).
# First time: `npx wrangler pages project create stoneqr --production-branch main`,
# then add the custom domain stoneqr.app in the Cloudflare dashboard.

set -euo pipefail
cd "$(dirname "$0")"

PROJECT="stoneqr"
DIST="apps/site/build"

echo "→ Running engine tests"
bun run --cwd packages/engine test

echo "→ Building site"
bun run --cwd apps/site build

if [[ "${1:-}" == "--dry-run" ]]; then
  echo "→ Dry run — contents of ./$DIST:"
  find "$DIST" -type f | sort
  exit 0
fi

echo "→ Deploying ./$DIST to Cloudflare Pages project '$PROJECT'"
npx wrangler pages deploy "$DIST" --project-name "$PROJECT"
echo "✓ Done. Verify at https://stoneqr.app"
