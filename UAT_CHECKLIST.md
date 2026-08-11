# User Acceptance Testing (UAT) Checklist

| ID | Role | Scenario | Expected Result | Actual Result | Status |
| -- | ---- | -------- | --------------- | ------------- | ------ |
| UAT-01 | Developer | Login and access Developer Dashboard | Dashboard loads, shows only their tasks | As expected | PASS |
| UAT-02 | Developer | Create new task | Task is created, assigned to logged-in Dev, `expectedDelivery` set correctly | As expected | PASS |
| UAT-03 | Developer | Submit daily update | `TaskUpdate` created, progress is updated, immutable log generated | As expected | PASS |
| UAT-04 | Developer | Submit for Testing | Task status changes to `READY_FOR_TESTING` | As expected | PASS |
| UAT-05 | Developer | Attempt to access another Dev's task | Direct URL manipulation returns "Unauthorized" | As expected | PASS |
| UAT-06 | Tester | View Testing Queue | Displays tasks globally in `READY_FOR_TESTING` or `TESTING` | As expected | PASS |
| UAT-07 | Tester | Claim task for testing | Task status changes to `TESTING`, assigned to logged-in Tester | As expected | PASS |
| UAT-08 | Tester | Pass testing on first try | Task becomes `COMPLETED`. Delivery delay frozen. First-Pass Success = TRUE | As expected | PASS |
| UAT-09 | Tester | Fail testing | Task becomes `REWORK_REQUIRED`. Defect is created, rework count increments | As expected | PASS |
| UAT-10 | Tester | Developer re-submits and Tester retests | `TaskRetest` record generated. Previous records preserved. First-Pass Success = FALSE | As expected | PASS |
| UAT-11 | Tester | Attempt to edit Dev's progress | Server-action boundary rejects mutation | As expected | PASS |
| UAT-12 | PM | Create new Project | Project created. `ActivityLog` generated | As expected | PASS |
| UAT-13 | PM | Assign members to Project | Members assigned in `ProjectMember`. Duplicates prevented | As expected | PASS |
| UAT-14 | PM | View Master Tasks | Filtering by Project, Dev, and Date works properly | As expected | PASS |
| UAT-15 | PM | View Productivity | Date filters apply dynamically. Output, Effort, Quality accurately aggregated | As expected | PASS |
| UAT-16 | PM | Attempt to edit Dev's execution data | No UI controls, and direct server-action POST rejected | As expected | PASS |
| UAT-17 | CEO | View Executive Dashboard | All management aggregations load dynamically and accurately | As expected | PASS |
| UAT-18 | CEO | Direct Server Action Invocation | Direct POST to `actionUpdateTask` fails with Unauthorized | As expected | PASS |
| UAT-19 | System | Scenario A: On Time Delivery | `Delivery Delay = 0` | As expected | PASS |
| UAT-20 | System | Scenario B: Early Delivery | `Delivery Delay = Negative Value` | As expected | PASS |
| UAT-21 | System | Scenario C: Late Delivery | `Delivery Delay = Positive Value (Days)` | As expected | PASS |
| UAT-22 | System | Scenario F: Rework delivery | Original expected baseline remains unchanged despite failing test | As expected | PASS |
| UAT-23 | System | Dynamic User Addition | New DB Dev automatically appears in PM and CEO dropdowns and tables | As expected | PASS |
| UAT-24 | System | Missing Record Error Handling | Graceful "Task not found" or Next.js boundary instead of raw SQL error | As expected | PASS |
| UAT-25 | System | Timezone Boundaries | `calculateOverdue()` accurately processes `Asia/Kolkata` day-shifts | As expected | PASS |
