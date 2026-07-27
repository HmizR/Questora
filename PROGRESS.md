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
- Lightweight submission and grading visibility with consistent status badges and timestamps
- Protected S3 upload foundation for future avatars, submission files, and lecturer mission resources
- Student assignment/project file uploads wired into the protected S3 foundation
- Self-service avatar image uploads wired into the protected S3 foundation
- Avatar display across account navigation, leaderboards, profiles, rosters, and submission review
- Lecturer-uploaded mission resources wired into the protected S3 foundation
- Mission resources display file type icons, readable sizes, filenames, and upload dates
- Mission resources include required/optional indicators, learning labels, descriptions, editable details, and required-first ordering
- Student inline mission resource previews for PDF, image, and text/markdown files
- AI resource text extraction for protected text, Markdown, and PDF mission resources
- AI context hardening for unreadable PDF text with sanitization, exclusion, clear, and retry recovery
- Admin/user polish with avatar-aware rosters, role/status badges, compact account details, and clearer account-control guidance
- Quiz and assignment UX polish with clearer student work states, quiz attempt summaries, submission stats, and analytics labels
- Lecturer roster, grades, submission review, and quiz analytics filters, sorting, needs-attention highlights, and CSV exports
- Due-date UX with student and lecturer due-soon/overdue panels and mission deadline badges
- Class announcements with lecturer draft/publish/archive/delete workflow and student published-only viewing
- Global AI assistant drawer MVP with Ollama provider, student mission/realm context, generic fallback, and client-only chat history
- Student mission AI context now includes extracted resource excerpts when available, capped and source-labeled
- Suspicious extracted resource text is excluded from AI prompts so bad PDFs do not break mission chat
- Streaming AI assistant responses with SSE, Ollama stream parsing, and stop-generation control
- pgvector RAG foundation for mission-scoped semantic retrieval over extracted resource chunks
- AI resource citations now use PDF page ranges or text/Markdown line ranges when available
- Isolated PostgreSQL integration test setup with service and server action coverage
- Playwright UI-level workflow test setup for admin, lecturer, and student paths
- GitHub Actions CI quality gate with a pgvector-enabled PostgreSQL service for Prisma validation, typecheck, lint, tests, e2e, and build
- Structured quiz attempts with multiple-choice/true-false questions and server-side scoring
- Lecturer-configured quiz attempt caps and best-attempt quiz grades
- Lecturer quiz analytics with participation, pass rate, and question-level answer distribution
- Student quiz attempt review with guarded correct-answer reveal
- Deployment readiness documentation and first-admin bootstrap script
- Production deployment dry run completed successfully

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
- `/lecturer/classes/[classId]/announcements`
- `/lecturer/classes/[classId]/announcements/new`
- `/lecturer/classes/[classId]/announcements/[announcementId]/edit`
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
- `/student/classes/[classId]/announcements`
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
- Submission/grading status visibility coverage for lecturer and student workflows
- GitHub Actions workflow for pull requests and pushes to `main`
- CI PostgreSQL service database and Playwright failure artifact upload
- Production deployment guide for Vercel and hosted PostgreSQL
- First-admin bootstrap command for production setup
- Successful production deployment dry run with real deployment environment checks
- Protected S3 upload foundation and student submission upload UI
- Account avatar upload UI
- Lecturer mission resource upload UI
- Resource file display polish with type labels, sizes, icons, and safer filename truncation
- Resource organization polish with required/optional metadata, controlled resource labels, descriptions, and editable ordering
- Server-side text extraction for protected text, Markdown, and PDF mission resources
- Extracted-text hardening and lecturer clear/retry recovery for problematic PDF resources
- Admin user/account polish for clearer rosters, account summaries, and reset/deactivation guidance
- Quiz and assignment UX polish for student work states, lecturer submission stats, and clearer analytics labels
- Lecturer analytics usability polish with filters, sorting, needs-attention highlights, and protected CSV exports
- Due-date UX with dashboard deadline panels, class deadline panels, and mission due-date badges
- Class announcements with lecturer authoring, recent overview panels, and student published-only access
- pgvector RAG foundation for mission-scoped semantic retrieval over extracted resource chunks
- AI resource citations with PDF page ranges and text/Markdown line ranges when available
- Storage orphan cleanup dry-run/delete workflow for managed S3/RustFS prefixes
- Submission revision history for assignment/project resubmissions before grading
- Redis-backed auth login rate limiting with Upstash REST, TCP Redis, local memory fallback, visible temporary lockout feedback, and inline email validation on `/login`
- AI tutoring-mode guardrails for graded student quiz, assignment, and project contexts without extra output-review model calls

Current automated coverage:

```text
70 unit tests passing
57 integration tests passing
Targeted lecturer resource e2e extraction checks passing
Targeted student AI assistant streaming e2e check passing
```

## Recommended Next Steps

- Deployment readiness:
  - CI verification on GitHub after the workflow is pushed
  - production smoke testing with real production-created data
- S3-backed upload polish:
  - add optional resource previews or resource sorting refinements if needed after use
  - add provider-level bucket lifecycle policies for temporary or aged orphan objects
- Quiz and assignment UX polish:
  - add full calendar views later if deadline panels are not enough
  - add quiz review improvements such as answer explanations, review settings, or question randomization
- AI assistant roadmap:
  - harden student AI guardrails beyond prompt-only behavior with context minimization and anti-impersonation/jailbreak instructions
  - for graded quiz/assignment/project contexts, avoid sending answer-key-like data unless it is safe for tutoring
  - keep output-review model calls as a later option because they add latency and resource usage
  - expand pgvector RAG from mission-scoped resource chunks to class-wide retrieval after usage patterns are clearer
  - consider Office document text extraction after upload safety, conversion tooling, and performance limits are clearer
  - improve assistant source display in the drawer now that resource chunks can cite PDF pages and text/Markdown lines
  - later add a lecturer grading assistant for summarizing submissions, suggesting feedback, and checking rubric coverage
  - keep lecturer AI grading suggestions human-reviewed and never auto-publish grades
  - consider AI conversation/message persistence only after deciding whether chat history is needed
- Production hardening:
  - reuse the Redis abstraction later for AI rate limits, upload/API throttles, duplicate-sensitive short-lived locks, temporary signed URL caches, and background job coordination if extraction or embeddings move async
