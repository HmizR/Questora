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
- Self-service account profile edits and password changes
- Admin-assisted password reset for MVP account recovery
- Modern responsive dashboard UI refresh with icons and persisted light/dark theme toggle
- Structured toast notifications and inline action error summaries
- Data-safety UX with confirmation dialogs and shared empty states
- Isolated PostgreSQL integration test setup with service and server action coverage
- Playwright UI-level workflow test setup for admin, lecturer, and student paths
- GitHub Actions CI quality gate for Prisma validation, typecheck, lint, tests, e2e, and build
- Structured quiz attempts with multiple-choice/true-false questions and server-side scoring
- Lecturer-configured quiz attempt caps and best-attempt quiz grades
- Lecturer quiz analytics with participation, pass rate, and question-level answer distribution
- Student quiz attempt review with guarded correct-answer reveal
- Deployment readiness documentation and first-admin bootstrap script

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
- Admin password reset for platform users
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
- Quiz analytics for quiz missions
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
- `/lecturer/classes/[classId]/modules/[moduleId]/activities/[activityId]/quiz`
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
- Review quiz attempt history with correct answers revealed after passing or exhausting attempts
- Quest log
- Global leaderboard using total profile XP
- Class leaderboard using quest XP earned in that class
- Public student profiles with XP, streaks, badges, and recent XP only
- Class-specific Grades tab with own published assignment, project, and quiz grades
- Profile with XP, level, badges, XP history, and own published grades
- Account page profile edits and password changes
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
- Quiz analytics are read-only and use stored quiz attempt answer JSON
- RPG-style dashboard cards and progress bars

## Phase 6: Quality

Completed:

- Expanded unit tests for core domain rules
- Login rate limiting
- Authorization review documentation
- README updates
- Build, lint, typecheck, tests, and Prisma validation passing
- Database-backed integration test configuration and fixtures for critical service/action flows
- Playwright e2e tests for login, enrollment, lecturer authoring, student submission, grading, quiz attempt caps, and leaderboard profile links
- Toast feedback coverage in representative admin, lecturer, and student browser workflows
- Account/password integration and browser workflow coverage
- Destructive-action confirmation and empty-state browser workflow coverage
- GitHub Actions workflow for pull requests and pushes to `main`
- CI PostgreSQL service database and Playwright failure artifact upload
- Production deployment guide for Vercel and hosted PostgreSQL
- First-admin bootstrap command for production setup

Current automated coverage:

```text
23 unit tests passing
15 integration tests passing
15 e2e tests passing
```

## Recommended Next Steps

- Deployment readiness:
  - CI verification on GitHub after the workflow is pushed
  - first real Vercel deployment dry run
  - production smoke testing with real production-created data
- Data safety UX:
  - lightweight visibility for grading/submission state changes
- S3-backed upload capability:
  - add S3 storage configuration and upload helpers with file type/size validation
  - support student assignment/project file uploads using the existing `Submission.fileUrl`
  - replace raw avatar URL entry with avatar image upload while still storing `User.avatarUrl`
  - add lecturer-uploaded mission resources for files such as PDFs, slides, and documents
  - keep the first pass simple: one submission file per submission and mission-scoped resources only
- Quiz and assignment UX polish:
  - refine quiz review states and analytics presentation
  - improve submission history/revision visibility before grading
  - add small lecturer-facing analytics refinements where useful
- Production hardening:
  - replace in-memory auth rate limiting with Redis before public/multi-instance deployment
