"use client";

import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function onSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const email = String(formData.get("email") ?? "")
        .trim()
        .toLowerCase();
      const nextFailedAttemptCount = incrementBrowserFailedAttempts(email);

      const result = await signIn("credentials", {
        email,
        password: formData.get("password"),
        redirect: false
      });

      if (result?.error) {
        const isRateLimited =
          result.code === "rate_limited" ||
          (await checkLoginRateLimitStatus(email)) ||
          nextFailedAttemptCount >= 5;

        if (isRateLimited) {
          setError("Too many failed sign-in attempts. Please wait a minute, then try again.");
          return;
        }

        setError("Invalid credentials or inactive account.");
        return;
      }

      clearBrowserFailedAttempts(email);
      router.push(searchParams.get("callbackUrl") ?? "/");
      router.refresh();
    });
  }

  return (
    <form action={onSubmit} className="space-y-5">
      <div>
        <label className="text-sm font-medium" htmlFor="email">
          Email
        </label>
        <input
          className="mt-2 w-full rounded-md border border-ink/15 bg-white px-3 py-2 outline-none ring-moss/40 focus:ring-4"
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
        />
      </div>
      <div>
        <label className="text-sm font-medium" htmlFor="password">
          Password
        </label>
        <input
          className="mt-2 w-full rounded-md border border-ink/15 bg-white px-3 py-2 outline-none ring-moss/40 focus:ring-4"
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
      </div>
      {error ? (
        <div
          className="rounded-md border border-ember/30 bg-ember/10 px-3 py-2 text-sm font-medium text-ember"
          role="alert"
        >
          {error}
        </div>
      ) : null}
      <button
        className="w-full rounded-md bg-ink px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-steel disabled:cursor-not-allowed disabled:opacity-70"
        disabled={isPending}
        type="submit"
      >
        {isPending ? "Entering realm..." : "Enter Questora"}
      </button>
    </form>
  );
}

function browserFailedAttemptsKey(email: string) {
  return `questora-login-attempts:${email}`;
}

function incrementBrowserFailedAttempts(email: string) {
  if (typeof window === "undefined") {
    return 1;
  }

  const key = browserFailedAttemptsKey(email);
  const previous = Number.parseInt(window.sessionStorage.getItem(key) ?? "0", 10);
  const next = Number.isFinite(previous) ? previous + 1 : 1;
  window.sessionStorage.setItem(key, String(next));
  return next;
}

function clearBrowserFailedAttempts(email: string) {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.removeItem(browserFailedAttemptsKey(email));
}

async function checkLoginRateLimitStatus(email: string) {
  try {
    const response = await fetch("/api/login/rate-limit", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ email })
    });

    if (!response.ok) {
      return false;
    }

    const data = (await response.json()) as { rateLimited?: boolean };
    return data.rateLimited === true;
  } catch {
    return false;
  }
}
