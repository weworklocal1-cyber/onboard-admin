# TODO_READY_WEBAPP.md

## Definition of Done (DoD) — “Ready to Use” PRD-grade
- Core workforce flows work end-to-end for logged-in users.
- Reminder automation runs daily and inserts notifications correctly.
- Critical actions are audit-logged (immutable audit_logs).
- GPS/fraud/distance rules are enforced server-side (not only UI).
- Overdue tasks are automatically flagged.
- Restaurant CRM includes timeline + document upload + GPS-verified interactions.
- Code is modernized (no `any` leaks, hook deps correct, lint/typecheck/build clean).
- Smoke test checklist completed.

---

## MUST (Implement/Finish)
### 1. Scheduled reminders / cron notifications (Edge Functions)
- [x] Attendance reminder @ 10:30 AM IST → insert notifications(type=attendance_reminder)
  - Implemented: `supabase/functions/attendance-reminder/index.ts`
- [ ] Checkout reminder @ 7:30 PM IST → insert notifications(type=checkout_reminder)
- [ ] EOD update reminder escalation @ 8:00/9:00/flag @ 10:00+ (per PRD)
- [ ] Follow-up engine reminder @ every 15 min (per PRD)

### 2. Audit/history wiring
- [ ] Insert audit_logs on critical changes:
  - attendance override
  - restaurant status changes
  - task status transitions
  - role changes
  - territory transfers

### 3. Backend enforcement of GPS/distance/fraud rules
- [ ] Check-in/out + restaurant visit GPS distance validation enforced in DB or API layer.
- [ ] Fraud prevention (duplicate visits within 30 min) enforced server-side.

### 4. Tasks automation
- [ ] Overdue tasks flagged automatically (status/task_assigned/notifications).
- [ ] Ensure task attachments are stored and permissioned.

### 5. CRM completeness
- [ ] Restaurant detail page shows timeline + documents.
- [ ] Restaurant interaction logging enforces GPS verification.

---

## SHOULD (Stabilize/Polish)
- [ ] De-dup notification inserts (idempotency keys)
- [ ] Fix any hook dependency warnings
- [ ] Ensure loading/error states consistent

---

## MODERNIZE (Code quality)
- [ ] Remove `any` where possible in workforce pages.
- [ ] Replace ad-hoc UI logic with typed helpers.
- [ ] Ensure typecheck passes clean.

---

## Tests / Smoke checklist (manual)
- [ ] Login as employee → check in/out works
- [ ] Submit daily update works
- [ ] Create task + comment + status transition works
- [ ] Founder dashboard loads without runtime errors
- [ ] Run typecheck, lint, build

