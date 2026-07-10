import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";

const roleHome = {
  ADMIN: "/admin",
  LECTURER: "/lecturer",
  STUDENT: "/student"
} as const;

export default async function HomePage() {
  const session = await auth();

  if (session?.user?.role && session.user.role in roleHome) {
    redirect(roleHome[session.user.role]);
  }

  redirect("/login");
}
