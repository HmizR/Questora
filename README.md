# Questora

Questora is an MVP gamified Learning Management System that presents classes as learning realms, modules as regions, activities as missions, and quest completion as XP-driven progress.

## Features

- Credential authentication with active-account checks.
- Basic login throttling for repeated failed credential attempts.
- Three primary roles: `ADMIN`, `LECTURER`, and `STUDENT`.
- Prisma/PostgreSQL domain schema for users, classes, modules, activities, quests, progress, submissions, grades, XP, and badges.
- Role-aware route protection for `/admin`, `/lecturer`, and `/student`.
- Service layer for authorization, activity progress, quest completion, XP transactions, badges, grades, enrollment, lecturer workflows, and student workflows.
- Seed data with one admin, two lecturers, five students, two classes, example modules, activities, quests, badges, and student profiles.

## Tech Stack

- Next.js App Router
- TypeScript
- PostgreSQL
- Prisma ORM
- Auth.js / NextAuth credentials provider
- Tailwind CSS
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

## Development

```bash
npm run dev
npm run lint
npm run typecheck
npm test
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
- Students access only enrolled classes, published modules, published activities, their own progress, their own submissions, their own grades, XP, level, and badges.

## Main Pages

- Admin: `/admin`, `/admin/users`, `/admin/classes`
- Lecturer: `/lecturer`, `/lecturer/classes`, `/lecturer/classes/[classId]/modules`, `/students`, `/quests`, `/submissions`
- Student: `/student`, `/student/classes`, `/student/classes/[classId]`, `/student/classes/[classId]/activities/[activityId]`, `/student/profile`

## Gamification Rules

- Quest completion is derived from required connected activity progress.
- Students cannot directly mark quests complete.
- XP is awarded only through `XPTransaction` records.
- XP transaction creation and `StudentProfile` updates happen in the same transaction.
- Duplicate XP rewards are blocked by unique idempotency keys.
- Level calculation is centralized as `floor(sqrt(totalXp / 100)) + 1`.
- Assignments and boss battles complete after lecturer grading, then run the same quest/XP/badge reward path.

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
