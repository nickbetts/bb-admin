#!/usr/bin/env bash
# PreToolUse hook: blocks `prisma db push` and `npm run db:push`.
# These bypass migration history and can corrupt the production Postgres schema state.
#
# Input (stdin): JSON with tool_name and tool_input fields.
# Output: JSON with permissionDecision: "deny" to block the call.

set -euo pipefail

INPUT=$(cat)
TOOL_NAME=$(echo "$INPUT" | python3 -c "import sys, json; d=json.load(sys.stdin); print(d.get('tool_name',''))" 2>/dev/null || echo "")
COMMAND=$(echo "$INPUT" | python3 -c "import sys, json; d=json.load(sys.stdin); print(d.get('tool_input',{}).get('command',''))" 2>/dev/null || echo "")

# Only inspect execute/run_in_terminal tool calls
if [[ "$TOOL_NAME" != "execute" && "$TOOL_NAME" != "run_in_terminal" ]]; then
  exit 0
fi

# Block prisma db push and npm run db:push
if echo "$COMMAND" | grep -qE '(prisma\s+db\s+push|npm\s+run\s+db:push)'; then
  cat <<'EOF'
{
  "permissionDecision": "deny",
  "permissionDecisionReason": "⛔ `prisma db push` is blocked. It bypasses migration history and will corrupt the production Postgres schema state.\n\nUse `npm run db:migrate` instead — this generates a migration SQL file that Vercel applies to production on deploy.\n\nOnly use `db:push` on a throwaway local dev branch (never on a branch that will be merged to production)."
}
EOF
  exit 0
fi

exit 0
