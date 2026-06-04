# Handoff Tools - Integration First

This folder is intended to be drag-and-dropped into another repository.

## What is included

- `grand-plan-tool/`: portable contracts + coherence core extracted from Grand Plan generator.
- `report-tool/`: portable section registry and report contracts extracted from Report generator.

## Immediate next steps in target repo

1. Copy `handoff-tools/` into the target repo root.
2. Ask your AI agent to read `handoff-tools/AI-INTEGRATION-PROMPT.md` and execute it.
3. Implement adapters for auth, persistence, AI provider, and screenshot storage.
4. Wire minimal endpoints first, then extend to full feature parity.

## Important

- Core modules in this bundle should not directly import host app auth or database clients.
- Keep secrets and provider keys in target-repo config, not in core modules.
- Safety: do not import from `handoff-tools/` inside this repository runtime code. This folder is for copy-out handoff only.
