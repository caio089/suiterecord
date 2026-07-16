#!/usr/bin/env bash
# Aplica migrations SQL no projeto Supabase do Alfredo via Management API.
# Requer: ~/.supabase/access-token (supabase login) OU SUPABASE_ACCESS_TOKEN
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
REF="${SUPABASE_PROJECT_REF:-}"
TOKEN="${SUPABASE_ACCESS_TOKEN:-}"

if [[ -z "$TOKEN" && -f "$HOME/.supabase/access-token" ]]; then
  TOKEN="$(tr -d '\n' < "$HOME/.supabase/access-token")"
fi

if [[ -z "$TOKEN" || -z "$REF" ]]; then
  echo "Defina SUPABASE_PROJECT_REF e SUPABASE_ACCESS_TOKEN (ou rode: npx supabase login)"
  exit 1
fi

apply_file() {
  local file="$1"
  echo "==> Applying $(basename "$file")"
  python3 - "$file" <<'PY' > /tmp/supabase_mig_payload.json
import json, pathlib, sys
print(json.dumps({"query": pathlib.Path(sys.argv[1]).read_text()}))
PY
  local code
  code=$(curl -sS -o /tmp/supabase_mig_result.json -w "%{http_code}" -X POST \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    "https://api.supabase.com/v1/projects/$REF/database/query" \
    --data-binary @/tmp/supabase_mig_payload.json)
  if [[ "$code" != "201" && "$code" != "200" ]]; then
    echo "FAILED HTTP $code"
    cat /tmp/supabase_mig_result.json
    exit 1
  fi
  echo "OK"
}

for f in "$ROOT"/supabase/migrations/*.sql; do
  apply_file "$f"
done

echo "Migrations aplicadas em $REF"
