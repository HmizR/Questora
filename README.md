# Questora

Questora is an MVP gamified Learning Management System that presents classes as learning realms, modules as regions, activities as missions, and quest completion as XP-driven progress.

## Features

- Credential authentication with active-account checks.
- Basic login throttling for repeated failed credential attempts.
- Three primary roles: `ADMIN`, `LECTURER`, and `STUDENT`.
- Prisma/PostgreSQL domain schema for users, classes, modules, activities, quests, progress, submissions, grades, XP, and badges.
- Role-aware route protection for `/admin`, `/lecturer`, and `/student`.
- Service layer for authorization, activity progress, quest completion, XP transactions, badges, grades, enrollment, lecturer workflows, and student workflows.
- Shared dashboard app shell with top account navigation and role-aware sidebar navigation.
- Modern responsive dashboard UI with icon navigation, polished cards, and a persisted light/dark theme toggle.
- Lecturer and student class workspaces use compact main-content tabs for regions, missions, quests, grades, and roster views.
- Lecturer region, mission, and quest creation/editing use dedicated pages and compact action menus to keep management lists clean.
- Lecturer submission review is mission-specific for assignments and projects, with a class-level Grades matrix.
- Quest edit pages manage connected missions, while quest lists show connected mission summaries and completion stats.
- Student leaderboards include a global XP ranking and class-specific quest XP ranking.
- Leaderboard names link to public student profiles with gamification data only.
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
```

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
npm run test:all
npm run build
```

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
- Lecturers manage only classes assigned to them, including modules, missions, quests, submissions, and grades.
- Lecturers can configure mission prerequisites from their class module panel.
- Students access only enrolled classes, published modules, published activities, their own progress, their own submissions, their own grades, XP, level, and badges.

## Main Pages

- Admin: `/admin`, `/admin/users`, `/admin/classes`
- Lecturer: `/lecturer`, `/lecturer/classes`, `/lecturer/classes/[classId]/modules`, `/modules/new`, `/modules/[moduleId]/edit`, `/modules/[moduleId]/activities/new`, `/modules/[moduleId]/activities/[activityId]/edit`, `/modules/[moduleId]/activities/[activityId]/submissions`, `/students`, `/quests`, `/quests/new`, `/quests/[questId]/edit`, `/grades`
- Student: `/student`, `/student/classes`, `/student/leaderboard`, `/student/profiles/[studentId]`, `/student/classes/[classId]`, `/student/classes/[classId]/activities/[activityId]`, `/student/classes/[classId]/quests`, `/student/classes/[classId]/leaderboard`, `/student/profile`
- Shared account page: `/account`

## Gamification Rules

- Quest completion is derived from required connected activity progress.
- Students cannot directly mark quests complete.
- XP is awarded only through `XPTransaction` records.
- XP transaction creation and `StudentProfile` updates happen in the same transaction.
- Duplicate XP rewards are blocked by unique idempotency keys.
- Level calculation is centralized as `floor(sqrt(totalXp / 100)) + 1`.
- Assignments and boss battles complete after lecturer grading, then run the same quest/XP/badge reward path.
- Global leaderboards use total profile XP; class leaderboards use quest XP transactions for that class.

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
