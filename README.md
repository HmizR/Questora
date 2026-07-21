# Questora

Questora is an MVP gamified Learning Management System that presents classes as learning realms, modules as regions, activities as missions, and quest completion as XP-driven progress.

## Features

- Credential authentication with active-account checks.
- Basic login throttling for repeated failed credential attempts.
- Three primary roles: `ADMIN`, `LECTURER`, and `STUDENT`.
- Prisma/PostgreSQL domain schema for users, classes, modules, activities, quizzes, quests, progress, submissions, grades, XP, and badges.
- Role-aware route protection for `/admin`, `/lecturer`, and `/student`.
- Service layer for authorization, activity progress, quest completion, XP transactions, badges, grades, enrollment, lecturer workflows, and student workflows.
- Shared dashboard app shell with top account navigation and role-aware sidebar navigation.
- Modern responsive dashboard UI with icon navigation, polished cards, and a persisted light/dark theme toggle.
- Structured toast notifications and inline action error summaries for admin, lecturer, and student workflows.
- Confirmation dialogs protect destructive admin and lecturer actions.
- Shared empty states make low-data dashboards and workspaces easier to recover from.
- Consistent status badges and timestamps clarify submission, grading, and publishing states.
- Account settings support self-service name/avatar edits and password changes.
- Admins can reset user passwords for MVP account recovery.
- Admin user management shows avatars, role/status badges, compact account summaries, and clearer password reset/deactivation guidance.
- Lecturer and student class workspaces use compact main-content tabs for regions, missions, quests, grades, and roster views.
- Lecturer region, mission, and quest creation/editing use dedicated pages and compact action menus to keep management lists clean.
- Lecturer submission review is mission-specific for assignments and projects, with a class-level Grades matrix.
- Assignment and project submissions can be edited until a lecturer grades them, then they lock.
- Assignment and quiz pages show clearer work status, attempt summaries, and review guidance for students and lecturers.
- Lecturer roster, grades, submission review, and quiz analytics tables support filters, sorting, needs-attention highlights, and protected CSV exports.
- Student and lecturer dashboards show due-soon and overdue deadline panels, with clearer deadline badges on student mission cards.
- Lecturers can draft, publish, archive, and delete class announcements; enrolled students see published realm updates.
- Quest edit pages manage connected missions, while quest lists show connected mission summaries and completion stats.
- Quiz missions support structured multiple-choice and true/false questions with server-side scoring and attempt history.
- Lecturers can cap quiz attempts; quiz grades use the highest student attempt score.
- Lecturer quiz analytics show participation, scores, pass rate, and question-level answer distribution.
- Students can review quiz attempt history, with correct answers hidden until they pass or use all attempts.
- Student leaderboards include a global XP ranking and class-specific quest XP ranking.
- Leaderboard names link to public student profiles with gamification data only.
- Student class workspaces include a Grades tab for own published assignment, project, and quiz grades.
- Protected S3 uploads support student assignment/project files, self-service avatar images, and lecturer mission resources with short-lived upload/download URLs.
- Uploaded mission resources show file type, readable size, original filename, upload date, required/optional state, learning label, and optional description.
- User avatars appear in account menus, leaderboards, profiles, lecturer rosters, and submission review.
- Seed data with one admin, two lecturers, five students, two classes, example modules, activities, quests, badges, and student profiles.

## Tech Stack

- Next.js App Router
- TypeScript
- PostgreSQL
- Prisma ORM
- Auth.js / NextAuth credentials provider
- Tailwind CSS
- Lucide React icons
- Zod
- Vitest

## Environment

Copy `.env.example` to `.env` and set:

```bash
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/questora?schema=public"
AUTH_SECRET="replace-with-a-long-random-secret"
AUTH_URL="http://localhost:3000"
S3_BUCKET="questora-uploads"
S3_REGION="us-east-1"
S3_ACCESS_KEY_ID="replace-with-access-key"
S3_SECRET_ACCESS_KEY="replace-with-secret-key"
# S3_ENDPOINT="https://s3-compatible-provider.example.com"
# S3_FORCE_PATH_STYLE="false"
```

The S3 variables power protected uploads. Student assignment/project submissions, account
avatars, and lecturer mission resources upload through presigned URLs while still accepting
pasted URLs or `s3:` references for development compatibility. Browser-based PUT uploads require bucket CORS that
allows `PUT` from your Questora app origin and the `Content-Type` header.

Removing a lecturer mission resource currently removes the Questora database record only.
The physical S3/RustFS object is intentionally left in storage for this MVP to avoid unsafe
deletion edge cases. Add a reviewed orphan-cleanup script or storage lifecycle policy before
relying on automatic physical object cleanup in production.

## Database

```bash
npm install
npx prisma validate
npx prisma migrate dev --name init
npm run prisma:seed
```

## Integration Tests

Database-backed integration tests use a separate PostgreSQL database and never use seed data.

Local PostgreSQL setup:

```bash
createdb questora_test
copy .env.test.example .env.test
npm run db:test:deploy
npm run test:integration
```

Optional Docker setup:

```bash
docker compose -f docker-compose.test.yml up -d
copy .env.test.example .env.test
```

For Docker, set `.env.test` to use port `5433`:

```text
DATABASE_URL_TEST="postgresql://postgres:postgres@localhost:5433/questora_test?schema=public"
```

Then run:

```bash
npm run db:test:deploy
npm run test:integration
```

The integration suite clears all tables in `DATABASE_URL_TEST` between tests. Do not point
`DATABASE_URL_TEST` at your development or production database.

## Development

```bash
npm run dev
npm run lint
npm run typecheck
npm test
npm run test:integration
npm run test:e2e
npm run test:all
npm run build
```

## Continuous Integration

GitHub Actions runs the full quality gate on pull requests and pushes to `main`.
The workflow uses a disposable PostgreSQL service database named `questora_test`
and uploads Playwright traces, screenshots, and videos when browser tests fail.

CI runs:

```bash
npm run prisma:validate
npm run db:test:deploy
npm run typecheck
npm run lint
npm test
npm run test:integration
npm run test:e2e
npm run build
```

## Deployment

The recommended first production target is Vercel with hosted PostgreSQL.
Production should use committed migrations and a one-time first-admin bootstrap,
not the development seed data.

```bash
npm run db:deploy
npm run admin:bootstrap
```

See [docs/deployment.md](docs/deployment.md) for environment variables, Vercel
setup, production migration flow, first-admin creation, and smoke checks.

## UI Workflow Tests

Playwright e2e tests run against the real Next.js app with the isolated PostgreSQL test
database. They seed deterministic users and learning content before each test.

```bash
npm run db:test:deploy
npm run test:e2e
npm run test:e2e:ui
```

The e2e server uses `questora_test` through `DATABASE_URL_TEST` and starts on port `3100`.

## Development Credentials

All seeded users use this password:

```text
Password123!
```

Accounts:

```text
admin@questora.dev
lecturer1@questora.dev
lecturer2@questora.dev
student1@questora.dev
student2@questora.dev
student3@questora.dev
student4@questora.dev
student5@questora.dev
```

## Role Permissions

- Admins manage users, classes, lecturer assignments, and student enrollment.
- Admins can reset user passwords without changing role or status.
- Lecturers manage only classes assigned to them, including modules, missions, quests, submissions, and grades.
- Lecturers can configure mission prerequisites from their class module panel.
- Students access only enrolled classes, published modules, published activities, their own progress, their own submissions, their own grades, XP, level, and badges.
- Student class Grades tabs show only the signed-in student's own published grades.

## Main Pages

- Admin: `/admin`, `/admin/users`, `/admin/classes`
- Lecturer: `/lecturer`, `/lecturer/classes`, `/lecturer/classes/[classId]/modules`, `/modules/new`, `/modules/[moduleId]/edit`, `/modules/[moduleId]/activities/new`, `/modules/[moduleId]/activities/[activityId]/edit`, `/modules/[moduleId]/activities/[activityId]/submissions`, `/modules/[moduleId]/activities/[activityId]/quiz`, `/students`, `/quests`, `/quests/new`, `/quests/[questId]/edit`, `/grades`
- Student: `/student`, `/student/classes`, `/student/leaderboard`, `/student/profiles/[studentId]`, `/student/classes/[classId]`, `/student/classes/[classId]/activities/[activityId]`, `/student/classes/[classId]/quests`, `/student/classes/[classId]/grades`, `/student/classes/[classId]/leaderboard`, `/student/profile`
- Shared account page: `/account`

## Gamification Rules

- Quest completion is derived from required connected activity progress.
- Students cannot directly mark quests complete.
- XP is awarded only through `XPTransaction` records.
- XP transaction creation and `StudentProfile` updates happen in the same transaction.
- Duplicate XP rewards are blocked by unique idempotency keys.
- Level calculation is centralized as `floor(sqrt(totalXp / 100)) + 1`.
- Assignments and boss battles complete after lecturer grading, then run the same quest/XP/badge reward path.
- Assignment/project resubmissions are allowed until grading; graded submissions can no longer be edited.
- Quizzes are scored on the server; passing attempts update progress to completed and can trigger quest XP.
- Quiz attempts are stored separately, and the highest attempt score is published as the quiz grade.
- Quiz grades remain separate from XP transactions.
- Quiz analytics read existing attempt records and do not change grades or XP.
- Global leaderboards use total profile XP; class leaderboards use quest XP transactions for that class.
- Protected submission uploads use `s3:<object-key>` storage references and short-lived signed download URLs.
- Lecturer mission resources use `s3:<object-key>` storage references and are available only to assigned lecturers or enrolled students who can access the published mission.

## UI Workflow Coverage

Playwright e2e tests cover login, admin enrollment, lecturer region/mission creation,
student assignment submission, lecturer grading/publishing, graded submission locking,
quiz attempt exhaustion, and leaderboard profile links.
They also assert toast feedback for representative admin, lecturer, and student actions.
Data-safety workflows cover destructive-action confirmation and empty-state rendering.
Submission and grading workflows also assert visible status labels for draft, published, locked, and submitted states.

## Quality Checks

The test suite includes focused coverage for authorization and gamification rules:

- Lecturer ownership
- Student enrollment and unpublished activity access
- Prerequisites
- Quest XP idempotency
- Own-grade visibility
- Grade/XP separation
- Boss Slayer badge condition
- Admin student enrollment permission
- Level and level-progress calculations
