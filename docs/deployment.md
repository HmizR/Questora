# Deployment Guide

Questora's recommended first production target is Vercel with a hosted PostgreSQL
database. CI verifies quality only; production deployment and database migration
remain explicit operator steps.

## Required Environment Variables

Set these in Vercel and in any shell used for production migration/bootstrap:

```text
DATABASE_URL="postgresql://..."
AUTH_SECRET="a-long-random-production-secret"
AUTH_URL="https://your-production-domain.example"
```

For first-admin bootstrap, set these only while running the bootstrap command:

```text
BOOTSTRAP_ADMIN_NAME="Questora Admin"
BOOTSTRAP_ADMIN_EMAIL="admin@example.com"
BOOTSTRAP_ADMIN_PASSWORD="a-strong-unique-password"
```

Do not use the development seed credentials in production.

## Vercel Setup

1. Create a Vercel project from the repository.
2. Add a hosted PostgreSQL database and copy its production connection string.
3. Set `DATABASE_URL`, `AUTH_SECRET`, and `AUTH_URL` in Vercel project settings.
4. Confirm GitHub Actions is green before deploying.
5. Deploy the app from Vercel.

## Production Database Setup

Run migrations against the production database before using the app:

```bash
npm ci
npm run prisma:validate
npm run db:deploy
```

Use `npm run prisma:migrate` only for local development. Production should use
`npm run db:deploy`, which runs committed migrations without creating new ones.

## First Admin Bootstrap

After migrations are applied, create or update the first admin:

```bash
BOOTSTRAP_ADMIN_NAME="Questora Admin" \
BOOTSTRAP_ADMIN_EMAIL="admin@example.com" \
BOOTSTRAP_ADMIN_PASSWORD="a-strong-unique-password" \
npm run admin:bootstrap
```

On Windows PowerShell:

```powershell
$env:BOOTSTRAP_ADMIN_NAME="Questora Admin"
$env:BOOTSTRAP_ADMIN_EMAIL="admin@example.com"
$env:BOOTSTRAP_ADMIN_PASSWORD="a-strong-unique-password"
npm run admin:bootstrap
```

The bootstrap command is idempotent for the same email. It creates or updates
one active `ADMIN` account and does not create demo lecturers, students, classes,
or quests.

## Smoke Checks

After deployment:

- Open `/login`.
- Log in with the bootstrap admin.
- Confirm `/admin` loads.
- Create one lecturer and one student.
- Create one class and assign the lecturer.
- Enroll the student.
- Log in as the lecturer and confirm the assigned realm appears.
- Log in as the student and confirm the enrolled realm appears.

## Production Hardening Later

Before public or multi-instance traffic, replace in-memory auth rate limiting
with Redis or another shared store. Keep `REDIS_URL` out of source control.
