# DevTrack User Acceptance Testing (UAT) Checklist

Use this checklist during manual testing to ensure business requirements are met.

## 1. Authentication & Security
- [ ] Verify users can log in with correct credentials.
- [ ] Verify invalid login shows appropriate error.
- [ ] Verify unauthenticated access redirects to `/login`.
- [ ] **(V1.0) Change Password**: Authenticate, navigate to Settings, enter wrong current password -> Fails.
- [ ] **(V1.0) Change Password**: Enter mismatched new passwords -> Fails.
- [ ] **(V1.0) Change Password**: Enter correct current password + matched new password -> Succeeds. Login again to verify.

## 2. Role-Based Access Control (RBAC) & IDOR
- [ ] Verify Developer cannot access `/pm/*` or `/ceo/*` or `/tester/*` routes.
- [ ] Verify PM cannot access `/developer/*` routes.
- [ ] **(V1.0) IDOR - Developer**: Log in as Developer A. Manually change URL to `/developer/tasks/{Task_ID_of_Developer_B}`. Must fail securely.
- [ ] **(V1.0) IDOR - Tester**: Log in as Tester A. Try to submit a retest API action for a task claimed by Tester B. Must fail securely.
- [ ] **(V1.0) CEO Boundaries**: Verify CEO interface has absolutely no form fields or mutation actions.

## 3. Task Lifecycle
- [ ] PM creates project and assigns developer.
- [ ] Developer creates task.
- [ ] Developer logs progress > 0. Status becomes IN_PROGRESS.
- [ ] Developer submits task for testing. Status becomes READY_FOR_TESTING.
- [ ] Tester views queue, clicks "Start Testing". Status becomes TESTING.
- [ ] Tester logs defect and fails task. Status becomes REWORK_REQUIRED.
- [ ] Developer views rework task, updates effort, submits again.
- [ ] Tester retests task and passes. Status becomes COMPLETED.

## 4. Timezone & Boundary Tests (V1.0)
- [ ] **(V1.0) IST Boundaries**: Simulate task creation at 11:30 PM IST (which is early evening UTC). Verify the dashboard treats the task's start date as belonging to the current IST day.
- [ ] **(V1.0) Overdue Calculation**: Create a task with a deadline of today. Verify it is not overdue until 12:00 AM IST tomorrow.
- [ ] **(V1.0) Early Delivery**: Developer completes a 5-day task in 2 days. Verify Delivery Delay is negative (`-3`) and not clamped to `0`.
- [ ] **(V1.0) Early Start**: Developer starts task 1 day before Planned Start. Verify Start Delay is `-1`.
