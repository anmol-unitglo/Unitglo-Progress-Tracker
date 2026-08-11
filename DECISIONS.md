# Architecture and Decision Log

This document records the architectural and business decisions made during the development of DevTrack.

## 2026-08-11: V1.0 Hardening - Dashboard Aggregation Performance
**Decision:** We will preserve the current `dashboardService.ts` aggregation architecture (in-memory filtering after raw row fetching).
**Why it was required:** The current architecture uses `findMany` and processes metrics in memory. While `_count`, `_avg`, and `groupBy` via Prisma/SQL would be more performant for large datasets, the current MVP volume is small.
**Alternatives considered:** Rewriting `dashboardService.ts` to use Prisma `groupBy` and native SQL aggregation.
**Why chosen:** The existing logic accurately models complex cross-object delays and boundary edge-cases that are difficult to write in Prisma aggregations natively in one step. Preservation of exact business logic was prioritized over premature optimization.
**Impact:** Safe, risk-free release.
**Future implications:** Once task counts exceed ~50,000, this service should be refactored to offload aggregation to SQL to prevent NodeJS memory bottlenecks.

## 2026-08-11: V1.0 Hardening - UTC Storage + IST Business Boundaries
**Decision:** Keep database storage in UTC, but enforce Asia/Kolkata (IST) for business boundaries in the service layer using `date-fns-tz`.
**Why it was required:** The Vercel edge runtime defaults to UTC. We noticed timezone boundary issues where tasks logged at 11:00 PM IST were calculated as the previous day or next day because UTC time was crossed.
**Alternatives considered:** Shifting the time manually before saving to the database.
**Why chosen:** Manual shifting creates corrupt database timestamps. Standard UTC storage ensures data portability. Business rules (like overdue checks and start of day) must be evaluated in IST on the fly.
**Impact:** Timestamps remain UTC in the DB. Overdue checks and Dashboard due-today checks now correctly use IST boundaries.

## 2026-08-11: V1.0 Hardening - Password Change Security Model
**Decision:** Only allow password changes by fetching the authenticated user's ID securely from `getServerSession`.
**Why it was required:** To prevent IDOR (Insecure Direct Object Reference) vulnerabilities where a user could change another user's password.
**Alternatives considered:** Accepting `userId` from the client form.
**Why chosen:** Security best practices mandate never trusting client-provided identifiers for sensitive actions.
**Impact:** Password changes are secure and explicitly bound to the current active session.

## 2026-08-11: V1.0 Hardening - Tester IDOR Protection
**Decision:** Enforce that a task can only be passed, failed, or retested by the Tester explicitly assigned to it (`task.testerId === session.user.id`).
**Why it was required:** A tester could manipulate URL IDs to pass or fail tasks they were not actively assigned to test.
**Alternatives considered:** Relying only on UI hiding.
**Why chosen:** Server-side identity enforcement is the only secure method.
**Impact:** `taskService.ts` tester actions now include strict `testerId` boundary checks.
