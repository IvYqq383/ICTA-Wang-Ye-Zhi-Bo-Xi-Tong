---
name: drizzle-kit push interactive prompt
description: Why db:push can stall in this env and the safe workaround for additive schema changes
---

`npm run db:push` (drizzle-kit) shows an interactive prompt when it can't tell whether a new table is a CREATE or a RENAME (e.g. "Is webinar_documents table created or renamed from another table?"). In this sandbox the prompt does NOT accept piped stdin (`echo "" |`, here-strings, `--force`) and `script -qc` also failed — it just re-renders and never proceeds.

**Workaround:** for purely additive changes (new table, new nullable/defaulted column), apply them directly via `psql "$DATABASE_URL"` using `CREATE TABLE IF NOT EXISTS` / `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`, matching the Drizzle schema column types exactly. Keep the Drizzle schema (`shared/schema.ts`) as the source of truth so future pushes converge.

**Why:** avoids being blocked by the un-feedable TTY prompt while keeping dev DB in sync with the schema.
