#!/usr/bin/env bash
set -euo pipefail

echo "=== MediCore Deployment Readiness Audit ==="
ISSUES=0
WARNINGS=0

fail() { echo "FAIL: $1"; ISSUES=$((ISSUES + 1)); }
warn() { echo "WARN: $1"; WARNINGS=$((WARNINGS + 1)); }
pass() { echo "PASS: $1"; }

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

echo ""
echo "--- Environment Variables ---"
for file in backend/.env.example frontend/.env.example; do
  if [ -f "$file" ]; then pass "$file exists"; else fail "$file is missing"; fi
done

if [ -f backend/.env ]; then pass "backend/.env present"; else warn "backend/.env not found (expected locally)"; fi

echo ""
echo "--- Dependencies ---"
if [ -d backend/node_modules ]; then pass "backend node_modules installed"; else warn "run: cd backend && npm install"; fi
if [ -d frontend/node_modules ]; then pass "frontend node_modules installed"; else warn "run: cd frontend && npm install"; fi

echo ""
echo "--- Prisma ---"
(cd backend && npx prisma validate) && pass "Prisma schema valid" || fail "Prisma schema validation failed"
(cd backend && npx prisma generate >/dev/null) && pass "Prisma client generated" || fail "Prisma generate failed"

echo ""
echo "--- Build ---"
(cd backend && npm run build) && pass "Backend build succeeded" || fail "Backend build failed"
(cd frontend && npm run build) && pass "Frontend build succeeded" || fail "Frontend build failed"

echo ""
echo "--- Security Scan (static) ---"
if grep -q 'production_secret_key_123_456' docker-compose.yml; then
  warn "docker-compose.yml contains hardcoded JWT secret"
else
  pass "No obvious hardcoded JWT secret in docker-compose.yml"
fi

if grep -q "force-reset" docker-compose.yml; then
  warn "docker-compose.yml still uses destructive prisma force-reset"
else
  pass "docker-compose.yml avoids force-reset on startup"
fi

echo ""
echo "--- Route / Health Files ---"
for endpoint_file in backend/src/app.ts backend/src/tests/health.test.ts backend/src/tests/journeyIntegration.test.ts; do
  if [ -f "$endpoint_file" ]; then pass "$endpoint_file present"; else fail "$endpoint_file missing"; fi
done

echo ""
echo "--- Summary ---"
echo "Issues:   $ISSUES"
echo "Warnings: $WARNINGS"

if [ "$ISSUES" -gt 0 ]; then
  echo "Deployment readiness audit: FAILED"
  exit 1
fi

echo "Deployment readiness audit: PASSED (with $WARNINGS warning(s))"
exit 0
