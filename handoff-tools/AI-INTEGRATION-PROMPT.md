You are integrating a dragged-in portability bundle from another Next.js repo.

Scope:

- `handoff-tools/grand-plan-tool`
- `handoff-tools/report-tool`

Tasks:

1. Create local adapter implementations for all interfaces under each `contracts/interfaces.ts` file.
2. Create thin API routes/controllers in this repo that call these adapters.
3. Keep host-specific code in adapters only.
4. Do not modify core files unless TypeScript compile errors require import/path fixes.
5. Add smoke tests for:
   - Grand plan create/load/save/version flow
   - Report create/sections/reorder flow
6. Produce a final report listing all files created/modified.

Constraints:

- No direct DB or auth imports inside `handoff-tools/*/core/*`.
- No hardcoded secrets.
- Keep public response shapes stable.
