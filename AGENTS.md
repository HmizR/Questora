# AGENTS.md

Guidance for coding agents working on Questora.

## Project Overview

Questora is a gamified LMS MVP built with:

- Next.js App Router
- TypeScript
- PostgreSQL
- Prisma ORM
- Auth.js / NextAuth credentials auth
- Tailwind CSS
- Zod
- Vitest

The product has exactly three primary roles for this MVP:

- `ADMIN`
- `LECTURER`
- `STUDENT`

Do not add multi-institution, faculty, curriculum, payment, guild, season, marketplace, custom-role, or complex social features.

## Current Architecture

- Prisma schema and seed data live in `prisma/`.
- App routes live in `src/app/`.
- Server-side business logic lives in `src/services/`.
- Reusable auth/resource checks live in `src/lib/authorization-service.ts`.
- Pure rule helpers used by tests live in `src/lib/domain-rules.ts`.
- Zod schemas live in `src/schemas/`.
- UI components live in `src/components/`.
- Tests live in `src/tests/`.

Keep important business logic out of React components and route handlers. Prefer service functions and reusable helpers.

## Security Rules

- Never trust frontend-submitted user IDs when the session identity can be used.
- Do not rely on role checks alone; also verify ownership or enrollment.
- Lecturers may manage only classes assigned to them.
- Students may access only active enrollments, published modules, published activities, their own progress, their own submissions, and their own published grades.
- XP must never be awarded by directly mutating `StudentProfile.totalXp`.
- Every XP change must create an `XPTransaction` with a unique idempotency key.
- Grades and XP must remain separate.
- Quest completion must be derived from activity progress.

## Development Commands

Use these checks after meaningful changes:

```bash
npm run lint
npm run typecheck
npm test
npm run build
npx prisma validate
```

Database setup:

```bash
npx prisma migrate dev
npm run prisma:seed
```

The seed password for all development users is:

```text
Password123!
```

## Code Style

- Keep TypeScript strict.
- Avoid `any`.
- Validate mutations with Zod.
- Prefer server components; use client components only for interactivity such as `useActionState`.
- Keep UI dense and practical for LMS workflows.
- Use RPG terminology in UI only:
  - Class = Learning Realm
  - Module = Region
  - Activity = Mission
  - Project = Boss Battle
  - XP = Experience Points

Keep database and backend naming professional.

## Testing Notes

Current tests focus on pure business rules and calculation helpers. Service and integration tests should be expanded if the project gets a dedicated test database.

Existing coverage includes:

- Lecturer ownership rule
- Student enrollment rule
- Unpublished activity access
- Prerequisite blocking
- Quest XP idempotency decision
- Student own-grade privacy
- Grade/XP separation
- Boss Slayer condition
- Admin enrollment permission
- Level calculation
- Level progress calculation
- Login rate limiting

## Known MVP Limits

- Quiz handling is intentionally simple.
- File uploads are represented as `fileUrl`.
- Login rate limiting is in-memory and should use Redis or a shared store for production multi-instance deployments.
- Tests are unit-focused; database-backed integration tests are a strong next step.
