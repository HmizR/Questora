# Authorization

Authorization must check both role and resource relationship.

Helpers live in `src/lib/authorization-service.ts`:

- `requireUser()`
- `requireRole(role)`
- `requireAdmin()`
- `requireClassLecturer(classId)`
- `requireClassEnrollment(classId)`

Examples:

- A lecturer can manage a class only when `class.lecturerId` matches the session user.
- A student can access a class only when they have an active `ClassStudent` enrollment.
- A student can access an activity only when the class enrollment is active, the module is published, the activity is published, availability rules pass, and prerequisites are satisfied.
- A student can view only their own published grades.

Middleware protects role route groups, but service-level checks remain required for all mutations and sensitive reads.

## Phase 6 Review Notes

- Admin mutations call `requireAdmin()` before changing users, classes, lecturer assignment, or enrollment.
- Lecturer mutations call `requireRole("LECTURER")` and then verify ownership through class/module/activity/quest/submission relationships.
- Student mutations call `requireRole("STUDENT")` and use the session user id. They never accept a frontend-submitted student id.
- Student activity access goes through publication, availability, enrollment, and prerequisite checks.
- Grade reads for students are filtered by session user id and `publishedAt`.
- XP and badge awards are only produced from server-side completion/grading flows.
- Login has a lightweight in-memory failed-attempt limiter. For production multi-instance deployments, replace it with a shared store such as Redis.
