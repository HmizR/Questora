import { EnrollmentStatus, UserRole } from "@prisma/client";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";

export async function requireUser() {
  const session = await auth();
  if (!session?.user?.id || session.user.status !== "ACTIVE") {
    throw new AppError("AUTHENTICATION_REQUIRED", "You must be signed in.");
  }

  return session.user;
}

export async function requireRole(role: UserRole) {
  const user = await requireUser();
  if (user.role !== role) {
    throw new AppError("FORBIDDEN", "You do not have permission to perform this action.");
  }

  return user;
}

export function requireAdmin() {
  return requireRole("ADMIN");
}

export async function requireClassLecturer(classId: string) {
  const user = await requireRole("LECTURER");
  const teachingClass = await db.class.findFirst({
    where: {
      id: classId,
      lecturerId: user.id
    }
  });

  if (!teachingClass) {
    throw new AppError("FORBIDDEN", "You can only manage classes assigned to you.");
  }

  return { user, class: teachingClass };
}

export async function requireClassEnrollment(classId: string) {
  const user = await requireRole("STUDENT");
  const enrollment = await db.classStudent.findFirst({
    where: {
      classId,
      studentId: user.id,
      status: EnrollmentStatus.ACTIVE
    }
  });

  if (!enrollment) {
    throw new AppError("FORBIDDEN", "You are not enrolled in this class.");
  }

  return { user, enrollment };
}
