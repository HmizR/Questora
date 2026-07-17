import { afterAll, beforeEach, vi } from "vitest";

if (!process.env.DATABASE_URL_TEST) {
  throw new Error("DATABASE_URL_TEST is required for integration tests.");
}

if (!process.env.DATABASE_URL_TEST.includes("questora_test")) {
  throw new Error("DATABASE_URL_TEST must point at an isolated questora_test database.");
}

process.env.DATABASE_URL = process.env.DATABASE_URL_TEST;

declare global {
  var __questoraMockSession: unknown;
}

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn()
}));

vi.mock("next/navigation", async () => {
  const redirectError = (path: string) => {
    const error = new Error(`NEXT_REDIRECT:${path}`);
    error.name = "NEXT_REDIRECT";
    throw error;
  };

  return {
    notFound: vi.fn(() => {
      const error = new Error("NEXT_NOT_FOUND");
      error.name = "NEXT_NOT_FOUND";
      throw error;
    }),
    redirect: vi.fn(redirectError)
  };
});

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(async () => globalThis.__questoraMockSession ?? null),
  handlers: {},
  signIn: vi.fn(),
  signOut: vi.fn()
}));

const { db } = await import("@/lib/db");

export function setMockSession(user: {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "LECTURER" | "STUDENT";
  status?: "ACTIVE" | "INACTIVE" | "SUSPENDED";
}) {
  globalThis.__questoraMockSession = {
    user: {
      ...user,
      status: user.status ?? "ACTIVE"
    }
  };
}

export function clearMockSession() {
  globalThis.__questoraMockSession = null;
}

async function clearDatabase() {
  await db.$transaction([
    db.studentBadge.deleteMany(),
    db.badge.deleteMany(),
    db.xPTransaction.deleteMany(),
    db.studentProfile.deleteMany(),
    db.grade.deleteMany(),
    db.submission.deleteMany(),
    db.quizAttempt.deleteMany(),
    db.activityProgress.deleteMany(),
    db.activityResource.deleteMany(),
    db.questActivity.deleteMany(),
    db.activityPrerequisite.deleteMany(),
    db.quest.deleteMany(),
    db.activity.deleteMany(),
    db.module.deleteMany(),
    db.classStudent.deleteMany(),
    db.class.deleteMany(),
    db.user.deleteMany()
  ]);
}

beforeEach(async () => {
  clearMockSession();
  await clearDatabase();
});

afterAll(async () => {
  await db.$disconnect();
});
