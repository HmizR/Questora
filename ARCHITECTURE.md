# ARCHITECTURE.md

Questora is a gamified LMS MVP built around clear academic domain models with RPG-style presentation in the UI.

## Application Stack

- Next.js App Router for pages, server components, route handlers, and server actions.
- TypeScript with strict application-level types.
- PostgreSQL as the source of truth.
- Prisma ORM for schema, migrations, and typed database access.
- Auth.js credentials authentication.
- Zod validation for server mutations and request payloads.
- Tailwind CSS and shared dashboard components for UI.
- Vitest for unit and integration tests.
- Playwright for browser workflow tests.

## Core Layers

### Routes

Routes live under `src/app`.

- `/admin` owns platform administration.
- `/lecturer` owns assigned-class teaching workflows.
- `/student` owns enrolled-class learning workflows.
- `/api` contains protected route handlers such as uploads and exports.

Protected pages rely on server-side auth and authorization checks. Client components are used only where interactivity is needed, such as forms, upload controls, menus, theme toggles, and confirmations.

### Services

Business logic lives in `src/services`.

Important rules should stay in services rather than route handlers or React components. Examples:

- class and enrollment management
- lecturer ownership checks
- activity progress
- quest completion
- XP transactions
- grading
- quiz attempts and analytics
- storage authorization
- deadline queries
- announcements

### Validation

Zod schemas live in `src/schemas`.

Server actions and route handlers validate incoming data before calling services. Client-side validation may improve UX, but server validation remains authoritative.

### Authorization

Reusable auth helpers live in `src/lib/authorization-service.ts`.

Authorization must check both role and resource relationship:

- Admins can manage all users and classes.
- Lecturers can manage only classes assigned to them.
- Students can access only active enrollments and published accessible content.
- Students can view only their own private submissions, progress, and grades.

## Data Model

Prisma schema lives in `prisma/schema.prisma`.

The backend keeps professional domain names:

- `Class`
- `Module`
- `Activity`
- `Quest`
- `Submission`
- `Grade`
- `XPTransaction`
- `ActivityResource`
- `Announcement`

The UI may present these as:

- Class = Learning Realm
- Module = Region
- Activity = Mission
- Project = Boss Battle
- XP = Experience Points

## Gamification

Grades and XP are intentionally separate.

- Grades represent academic assessment.
- XP represents gamified progress.
- XP must always be awarded through `XPTransaction`.
- Student profile XP and level updates happen in the same transaction as XP awards.
- Quest completion is derived from required connected activity progress.
- Students cannot directly mark quests complete.

## Uploads And Storage

Questora uses protected S3-compatible storage through presigned URLs.

Stored application references use opaque `s3:<object-key>` values. The app resolves protected downloads through authorized short-lived signed URLs.

Current upload surfaces:

- student assignment/project submissions
- self-service avatars
- lecturer mission resources

Mission resources can have extracted text chunks in PostgreSQL. The MVP extracts only
protected `s3:<object-key>` resources that are plain text, Markdown, or PDF. Office files,
images, zip archives, unknown types, and external URLs are marked unsupported for extraction
while remaining available for authorized download/preview. Extraction is synchronous when a
lecturer creates a resource, and lecturers can retry failed extraction from the mission edit
page. Extracted text is sanitized before storage and again before AI prompt assembly. Suspicious
or unreadable extraction output is marked failed or excluded from AI context so one bad PDF does
not block students from using the assistant with the rest of the mission.

Extracted resource chunks can also store pgvector embeddings for mission-scoped semantic
retrieval. Questora keeps vector-specific writes/searches in raw SQL and keeps ordinary
resource metadata in Prisma. Hosted PostgreSQL must support `CREATE EXTENSION vector`.

Resource deletion currently removes database rows only. Physical S3/RustFS object cleanup should be handled later with a reviewed cleanup helper or lifecycle policy.

## UI Structure

Protected pages use a shared dashboard shell:

- sticky top navbar
- role-aware global sidebar
- class workspace tabs in the main content area
- responsive tables and scrollable tabs
- structured toasts and inline action errors
- confirmation dialogs for destructive actions
- shared empty states and status badges

## Testing

Questora uses three levels of automated coverage:

- Unit tests for pure rules and helpers.
- Integration tests against isolated PostgreSQL for services, server actions, uploads, exports, and authorization.
- Playwright e2e tests for admin, lecturer, and student workflows.

`npm test` remains the fast unit suite. Database-backed and browser suites use the isolated `questora_test` database.

## Deployment

The intended first production deployment is Vercel with hosted PostgreSQL.

Production should use:

- committed Prisma migrations
- `prisma migrate deploy`
- production environment variables
- first-admin bootstrap script
- manual smoke checks with production-created data

Development seed data should not be used in production.

## Future AI Assistant Layer

AI should be introduced as a controlled assistant layer, not as a replacement for LMS rules or lecturer judgment.

### Student Mission Assistant

Recommended first AI feature:

- appears inside student mission pages
- answers questions about the current mission
- uses mission content, lecturer-uploaded resources, and class announcements as context
- cites the source material used where practical
- supports explanation, summarization, hints, study questions, and quiz-me flows
- avoids completing graded submissions for students

Start with mission-scoped context before adding embeddings or document retrieval. This keeps authorization and behavior easier to reason about.

Current AI MVP:

- mounted as a global protected drawer in the dashboard shell
- uses rich page context on student mission and student realm pages
- streams responses over a protected Server-Sent Events endpoint
- keeps the original JSON chat endpoint as a fallback
- falls back to general help on unsupported protected pages
- stores chat history in browser state only
- includes authorized extracted resource excerpts for student mission context when available
- retrieves relevant mission resource chunks through pgvector when embeddings are ready
- caps extracted resource context before sending it to the provider
- re-sanitizes extracted resource excerpts before provider requests and skips suspicious chunks

### AI Provider Strategy

The first implementation should be provider-agnostic at the service boundary, with Ollama as the recommended local development provider.

Initial local configuration:

```env
AI_PROVIDER=ollama
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=qwen3:8b
EMBEDDING_PROVIDER=ollama
OLLAMA_EMBEDDING_MODEL=nomic-embed-text
```

Ollama keeps early experimentation inexpensive and local. `qwen3:8b` is the preferred first model for mission Q&A, summaries, hints, and study support.

The application should avoid coupling UI or authorization logic to Ollama directly. A thin provider interface should make it possible to add hosted providers later, for example:

```env
AI_PROVIDER=openai
OPENAI_API_KEY=...
OPENAI_MODEL=...
```

Streaming responses are supported for Ollama through the provider interface. Additional hosted
providers should implement the same stream/fallback contract instead of changing drawer or
authorization logic.

Embeddings use the same provider-boundary approach. The first implementation uses Ollama's
`nomic-embed-text` model and stores 768-dimensional vectors in pgvector.

### Lecturer Grading Assistant

Recommended later AI feature:

- appears in mission-specific submission review pages
- summarizes a student's submission
- suggests feedback
- checks rubric or instruction coverage once rubrics exist
- may suggest a score only as a clearly labeled draft

Lecturers must remain the final decision-makers. AI should never publish grades automatically.

### Likely AI Architecture

Future implementation may add:

- `AIConversation`
- `AIMessage`
- optional embeddings/vector search for larger resource sets
- `services/ai-service.ts`
- provider adapters such as `services/ai/ollama-provider.ts`
- protected `/api/ai/chat` route

AI authorization should reuse existing ownership and enrollment rules:

- students can chat only about published accessible class content they are enrolled in
- lecturers can use AI only for classes they teach
- private submissions and grades must never be exposed across students

### AI Safety Notes

- Do not trust client-submitted user IDs.
- Do not send another student's private work to a student chat.
- Keep prompts and responses scoped to authorized resources.
- Treat AI output as advisory.
- Add logging and rate limiting before public production usage.
- Consider whether chat history should be persisted before adding conversation tables.
