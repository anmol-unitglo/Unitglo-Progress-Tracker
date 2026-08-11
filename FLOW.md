# DevTrack Flow Architecture

This document maps the exact flow of data and Server Actions through the DevTrack system for each role.

## 1. Authentication & Security (All Roles)

- **Middleware (`src/middleware.ts`)**: Validates the `next-auth` JWT session on every request. It maps the root path prefixes (`/pm`, `/ceo`, `/developer`, `/tester`) to the expected session role and redirects unauthorized users to `/login`.
- **Server-Side Enforcement**: Server actions explicitly call `requireRole(role)` which pulls the user ID and role directly from `getServerSession()`. The frontend NEVER sends user IDs for identity validation, ensuring developers cannot spoof another developer's ID.

## 2. Developer Flow
- **Task Creation (`/developer/tasks/new`)**: 
  - Submits to `actionCreateTask(formData)`.
  - Service `taskService.createTask()` computes `expectedDelivery = plannedStart + commitment`.
- **Daily Progress (`/developer/tasks/[id]`)**:
  - Submits to `actionUpdateTask(taskId, formData)`.
  - Service logs `TaskUpdate` history immutably.
- **Submit for Testing**:
  - Submits to `actionSubmitForTesting(taskId)`.
  - Status becomes `READY_FOR_TESTING` globally.

## 3. Tester Flow
- **Claiming a Task (`/tester/dashboard`)**:
  - Submits to `actionStartTesting(taskId)`.
  - Status becomes `TESTING`. Tester ID is hard-linked.
- **Passing a Task**:
  - Submits to `actionPassTesting(taskId)`.
  - Status becomes `COMPLETED`. 
  - Service freezes the final `Delivery Delay`.
- **Failing a Task**:
  - Submits to `actionFailTesting(taskId, defectData)`.
  - Status becomes `REWORK_REQUIRED`.
  - Service logs a new `Defect` and increments `defectCount`/`reworkCount`.
- **Retesting**:
  - Submits to `actionRetest(taskId, result, remarks)`.
  - Service logs `TaskRetest` history.

## 4. PM Flow (Project Management)
- **Project Creation (`/pm/projects/new`)**:
  - Submits to `actionCreateProject(formData)`.
  - Uses `projectService.ts` to log project creation in Activity log.
- **Team Assignment (`/pm/projects/[id]`)**:
  - Submits to `actionAssignMembers(projectId, userIds)` or `actionRemoveMember`.
  - Assigns dynamic developers/testers to the Project Member tables.
- **Dashboards & Productivity (`/pm/dashboard`, `/pm/productivity`)**:
  - Exclusively reads aggregated data from `dashboardService.getDynamicDeveloperPerformance()`.
  - Aggregation dynamically joins all Developer tasks, filtering by explicit Date ranges when requested on the Productivity screen.

## 5. CEO Flow (Executive Oversight)
- **CEO Dashboard (`/ceo/dashboard`)**:
  - Read-only interface consuming the EXACT same aggregation methods (`getDashboardSummary`, `getProjectPerformance`, `getDynamicDeveloperPerformance`) as the PM from `dashboardService.ts`.
  - Has NO mutative Server Actions in the source code.
