import { Suspense } from "react";

import { LoginForm } from "@/app/login/login-form";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <section className="w-full max-w-md rounded-lg border border-ink/10 bg-white p-8 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-wide text-moss">Questora LMS</p>
        <h1 className="mt-3 text-3xl font-bold">Begin your learning quest</h1>
        <p className="mt-3 text-sm leading-6 text-ink/70">
          Sign in with your development account to manage realms, guide learners, or complete
          missions.
        </p>
        <div className="mt-8">
          <Suspense fallback={null}>
            <LoginForm />
          </Suspense>
        </div>
      </section>
    </main>
  );
}
