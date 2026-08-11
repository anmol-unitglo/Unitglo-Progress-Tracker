# DevTrack System Flow

This document details the exact execution paths and workflows implemented in DevTrack.

## 1. Authentication Flow
`Login Page (/login)`
→ `NextAuth Credentials Provider (api/auth/[...nextauth]/route.ts)`
→ `Prisma user lookup by email`
→ `bcrypt.compare(password, user.password)`
→ JWT Token created with `{ id: user.id, role: user.role }`
→ `middleware.ts` intercepts protected routes
→ Redirects user to role-specific dashboard based on `token.role`.

## 2. Password Change Flow
`Settings Page (/settings)`
→ `actionChangePassword` in `userActions.ts`
→ `getServerSession` retrieves authenticated user identity
→ `prisma.user.findUnique` fetches user record
→ `bcrypt.compare` verifies current password
→ `bcrypt.hash` hashes new password
→ `prisma.user.update`
→ `prisma.activityLog.create("PASSWORD_CHANGED")` without logging credentials
→ Success response to client.

## 3. Developer Task Lifecycle Flow
`Developer Dashboard (/developer/dashboard)`
→ Selects Task `/developer/tasks/[id]`
→ `actionUpdateTask` in `taskActions.ts`
→ `requireRole("DEVELOPER")` + `task.developerId === session.user.id` checks ownership
→ `updateDeveloperTaskProgress` calculates Start Delay (if just starting), updates effort, logs to `TaskUpdate`
→ Developer finishes and clicks "Submit for Testing"
→ `actionSubmitForTesting`
→ `submitTaskForTesting`
→ Status changes to `READY_FOR_TESTING`

## 4. Tester Task Lifecycle Flow
`Tester Dashboard (/tester/dashboard)`
→ Views Queue of `READY_FOR_TESTING` tasks
→ Clicks "Start Testing" on Task `/tester/tasks/[id]`
→ `actionStartTesting` in `taskActions.ts`
→ `startTaskTesting` assigns `testerId = session.user.id` and status to `TESTING`.

### Pass Scenario:
→ Tester clicks "Pass Task"
→ `actionPassTesting`
→ `requireRole("TESTER")` + `task.testerId === session.user.id` IDOR check
→ `passTaskTesting` calculates `Delivery Delay`, records to `TaskTesting`, sets status to `COMPLETED`.

### Fail Scenario:
→ Tester logs defect and clicks "Fail & Request Rework"
→ `actionFailTesting`
→ `failTaskTestingAndCreateDefect` logs to `Defect` table, increments `defectCount`/`reworkCount`, sets status `REWORK_REQUIRED`.

## 5. PM Project Management Flow
`PM Projects Page (/pm/projects)`
→ "Create Project"
→ `actionCreateProject` in `projectActions.ts`
→ `requireRole("PM")`
→ `createProject` stores record
→ PM Dashboard displays aggregated project health.

## 6. Timezone Calculation Flow
`dashboardService.ts`
→ Uses `getISTDate()`, `startOfDayIST()`, and `endOfDayIST()` from `utils/date.ts`
→ Boundaries are explicitly cast to `Asia/Kolkata`
→ E.g. "Due Today" relies on IST midnight boundaries, regardless of server UTC time.
