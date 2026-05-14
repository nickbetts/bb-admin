---
applyTo: "prisma/schema.prisma"
---

# Prisma Schema Conventions

## Primary keys
Always use `@id @default(cuid())` — never `@default(autoincrement())`.

## Every new model requires
```prisma
id        String   @id @default(cuid())
createdAt DateTime @default(now())
updatedAt DateTime @updatedAt
```

## Relations
- Always add `onDelete: Cascade` when a child record should be deleted with its parent.
- Always add `@@index` for every foreign key field and any field combination used in `WHERE` clauses.
- Add `@@unique` for composite natural keys used in upserts.

## New fields on existing models
- Use nullable types (`String?`, `Int?`, `DateTime?`) for all new optional fields — existing rows cannot have a non-nullable value.
- Only add `@default` if every existing row can satisfy it without a backfill migration.
- Add new fields at the **end** of the model block.

## Migration workflow — REQUIRED
```bash
# 1. Edit prisma/schema.prisma
# 2. Run migration (generates SQL + applies to your local Neon branch)
npm run db:migrate
# Give it a descriptive name e.g. "add_client_pinterest_fields"

# 3. Commit BOTH the schema change AND the generated migration file
# prisma/migrations/<timestamp>_<name>/migration.sql
```

**Never use `prisma db push` or `npm run db:push` for production-destined changes.** It bypasses migration history and will break production's schema state. Only use `db:push` on a throwaway local branch.

## JSON fields
Prisma stores `Json` as native JSON in Postgres. Always parse defensively in application code:
```typescript
let parsed: Record<string, unknown> = {};
if (typeof record.field === "string") {
  try { parsed = JSON.parse(record.field); } catch { /* use empty default */ }
} else if (record.field && typeof record.field === "object") {
  parsed = record.field as Record<string, unknown>;
}
```

## Client singleton
Always import from `src/lib/prisma.ts`. Never instantiate `PrismaClient` directly in route files.
