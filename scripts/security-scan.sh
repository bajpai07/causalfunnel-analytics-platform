#!/usr/bin/env bash
# Run security scans locally before pushing
# Prerequisites: trivy installed, npm/pnpm available

set -euo pipefail

echo "CausalFunnel Security Scan"
echo "──────────────────────────"

# 1. Dependency audit
echo "1/4 Running pnpm audit..."
pnpm audit --audit-level=high || {
  echo "WARN: High severity vulnerabilities found. Review before deploying."
}

# 2. Trivy filesystem scan
echo "2/4 Running Trivy filesystem scan..."
if command -v trivy &> /dev/null; then
  trivy fs . \
    --severity HIGH,CRITICAL \
    --exit-code 0 \
    --format table \
    --ignorefile .trivyignore
  echo "Trivy filesystem scan complete."
else
  echo "SKIP: trivy not installed. Install from https://trivy.dev"
fi

# 3. Check for hardcoded secrets
echo "3/4 Scanning for hardcoded secrets..."
SECRETS_FOUND=0

# Check for common secret patterns
if grep -r \
  -e 'password\s*=\s*["\x27][^"\x27]\+["\x27]' \
  -e 'secret\s*=\s*["\x27][^"\x27]\+["\x27]' \
  -e 'api_key\s*=\s*["\x27][^"\x27]\+["\x27]' \
  --include="*.ts" --include="*.js" --include="*.json" \
  --exclude-dir=node_modules --exclude-dir=dist --exclude-dir=.next \
  packages/ 2>/dev/null | grep -v ".example" | grep -v "test"; then
  echo "WARN: Potential hardcoded secrets found above. Review before committing."
  SECRETS_FOUND=1
fi

if [ "$SECRETS_FOUND" -eq 0 ]; then
  echo "No hardcoded secrets detected."
fi

# 4. Check .env is gitignored
echo "4/4 Checking .env gitignore status..."
if git check-ignore -q .env 2>/dev/null; then
  echo ".env is properly gitignored ✓"
else
  echo "ERROR: .env is NOT gitignored. Add it to .gitignore immediately."
  exit 1
fi

echo "──────────────────────────"
echo "Security scan complete."
