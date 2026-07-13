# PROGRESS.md

Questora MVP implementation progress.

## Overall Status

Core six-phase MVP implementation is complete:

- Phase 1: Foundation
- Phase 2: Admin
- Phase 3: Lecturer
- Phase 4: Student
- Phase 5: Gamification
- Phase 6: Quality

Post-MVP UI refresh completed:

- Hybrid protected dashboard shell
- Sticky top navbar
- Role-aware sidebar navigation
- Class/realm workspace tabs in the main content area
- Dedicated lecturer create/edit pages for regions, missions, and quests
- Compact lecturer action menus for edit, publish, and delete actions
- Mission-specific submission review and class-level Grades tab
- Assignment/project submission edits locked after grading
- Quest connected-mission management with completion stats
- Global and class-specific student leaderboards
- Public student profiles linked from leaderboards
- Student class Grades tab for own published assignment, project, and quiz grades
- Shared `/account` page
- Modern responsive dashboard UI refresh with icons and persisted light/dark theme toggle
- Isolated PostgreSQL integration test setup with service and server action coverage
- Structured quiz attempts with multiple-choice/true-false questions and server-side scoring
- Lecturer-configured quiz attempt caps and best-attempt quiz grades

Latest verified checks:

```bash
npm run typecheck
npm run lint
npm test
npm run build
npx prisma validate
```

## Phase 1: Foundation

Completed:

- Next.js App Router project scaffold
- TypeScript, Tailwind CSS, ESLint, Vitest setup
- PostgreSQL Prisma schema for the full MVP domain
- Initial Prisma migration
- Seed script with admin, lecturers, students, classes, enrollments, modules, activities, quests, badges, and student profiles
- Auth.js credentials authentication
- Secure password hashing with bcrypt
- Role-based middleware protection
- Core authorization helpers
- Initial service layer
- README and domain/authorization/gamification docs

## Phase 2: Admin

Completed:

- Admin dashboard statistics
- User list, create, edit, deactivate
- Class list, create, edit
- Lecturer assignment
- Student enrollment and removal from active enrollment
- Zod validation for admin mutations
- Server actions with typed errors
- Admin navigation

Key routes:

- `/admin`
- `/admin/users`
- `/admin/users/new`
- `/admin/users/[userId]`
- `/admin/classes`
- `/admin/classes/new`
- `/admin/classes/[classId]`

## Phase 3: Lecturer

Completed:

- Assigned class list
- Lecturer class dashboard
- Module create/update/publish/delete
- Activity create/update/publish/delete
- Dedicated create/edit pages for regions, missions, and quests
- Compact triple-dot action menus for region, mission, and quest rows
- Activity prerequisite add/remove controls
- Quest create/update/publish/delete
- Connect and remove quest missions from quest edit pages
- Quest completion stats for active students
- Student roster and progress summary
- Mission-specific submission review
- Class grade matrix across students and non-lesson missions
- Assignment grading and grade publishing
- Lecturer ownership checks for all mutations

Key routes:

- `/lecturer`
- `/lecturer/classes`
- `/lecturer/classes/[classId]`
- `/lecturer/classes/[classId]/modules`
- `/lecturer/classes/[classId]/modules/new`
- `/lecturer/classes/[classId]/modules/[moduleId]/edit`
- `/lecturer/classes/[classId]/modules/[moduleId]/activities/new`
- `/lecturer/classes/[classId]/modules/[moduleId]/activities/[activityId]/edit`
- `/lecturer/classes/[classId]/modules/[moduleId]/activities/[activityId]/submissions`
- `/lecturer/classes/[classId]/students`
- `/lecturer/classes/[classId]/quests`
- `/lecturer/classes/[classId]/quests/new`
- `/lecturer/classes/[classId]/quests/[questId]/edit`
- `/lecturer/classes/[classId]/grades`

## Phase 4: Student

Completed:

- Student dashboard
- Enrolled class list
- Published module/activity browsing
- Activity viewer
- Start activity
- Complete lesson
- Submit assignment/project
- Edit assignment/project submissions until lecturer grading
- Attempt structured quizzes with unlimited attempts and best-score progress
- Attempt structured quizzes with lecturer-configured attempt caps
- Quest log
- Global leaderboard using total profile XP
- Class leaderboard using quest XP earned in that class
- Public student profiles with XP, streaks, badges, and recent XP only
- Class-specific Grades tab with own published assignment, project, and quiz grades
- Profile with XP, level, badges, XP history, and own published grades
- Student enrollment/publication/prerequisite checks

Key routes:

- `/student`
- `/student/classes`
- `/student/leaderboard`
- `/student/profiles/[studentId]`
- `/student/classes/[classId]`
- `/student/classes/[classId]/activities/[activityId]`
- `/student/classes/[classId]/quests`
- `/student/classes/[classId]/grades`
- `/student/classes/[classId]/leaderboard`
- `/student/profile`

## Phase 5: Gamification

Completed:

- Quest completion derived from required connected activity progress
- XP awarded through `XPTransaction`
- Idempotency keys prevent duplicate quest XP
- Student profile XP and level updated in the same transaction as XP transaction creation
- Level formula encapsulated
- Level progress helper and UI
- Badges:
  - First Step
  - Quest Beginner
  - Boss Slayer
  - Perfect Score
- Assignment/project grading triggers activity completion reward flow
- Graded assignment/project submissions are locked from further student edits
- Quiz attempts store attempt history, update best score, and trigger completion rewards only after passing
- Quiz grades are auto-published from each student's highest quiz attempt score
- RPG-style dashboard cards and progress bars

## Phase 6: Quality

Completed:

- Expanded unit tests for core domain rules
- Login rate limiting
- Authorization review documentation
- README updates
- Build, lint, typecheck, tests, and Prisma validation passing
- Database-backed integration test configuration and fixtures for critical service/action flows

Test count at completion:

```text
20 tests passing
```

## Recommended Next Steps

- Add database-backed integration tests with an isolated test PostgreSQL database.
- Add UI-level tests for admin, lecturer, and student workflows.
- Add richer quiz analytics and per-question review.
- Add structured toast/error display for server action field errors.
- Replace in-memory auth rate limiting with Redis for production.
- Add CI to run lint, typecheck, tests, build, and Prisma validation.
