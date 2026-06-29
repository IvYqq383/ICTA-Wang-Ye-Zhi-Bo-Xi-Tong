---
name: Post-webinar sequence email idempotency
description: Why enqueueing segmented follow-up sequence emails needs a DB-level partial unique index, not just an app-level check
---

# Post-webinar email-sequence enqueue idempotency

The scheduler loops every 60s and, for each ended webinar, enqueues one `email_reminders` row (reminderType `sequence`) per matching registration × enabled sequence. Matching is by segment (all / watched / not_watched / no_show; watched threshold = 70% of video duration).

## Rule: enforce idempotency at the DB, not just app-level check-then-insert
There is a partial unique index `email_reminders_reg_seq_uniq` on `(registration_id, sequence_id) WHERE sequence_id IS NOT NULL`. The enqueue path still does an app-level `hasSequenceReminder` pre-check, but the unique index is the real guarantee — the insert is wrapped in try/catch so a conflict is silently skipped.
**Why:** check-then-insert across a 60s loop / restart race / multiple instances can double-enqueue, sending duplicate follow-up emails to the same registrant. App-level checks alone are not concurrency-safe.
**How to apply:** any "enqueue once per (entity, campaign)" pattern must back the dedupe with a unique constraint/index; treat the app-level check as an optimization only. The index lives in the Drizzle schema (`emailReminders` table extras) so it survives db:push.
