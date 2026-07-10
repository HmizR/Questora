import { ClassStatus, EnrollmentStatus, Prisma, UserRole } from "@prisma/client";

import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";

async function assertLecturer(lecturerId: string) {
  const lecturer = await db.user.findUnique({ where: { id: lecturerId } });
  if (!lecturer || lecturer.role !== UserRole.LECTURER) {
    throw new AppError("BAD_REQUEST", "Selected user is not a lecturer.");
  }

  return lecturer;
}

export async function createClass(input: {
  name: string;
  code: string;
  description?: string;
  lecturerId: string;
  status: ClassStatus;
  startDate?: Date;
  endDate?: Date;
  createdById: string;
}) {
  await assertLecturer(input.lecturerId);

  try {
    return await db.class.create({
      data: {
        name: input.name,
        code: input.code,
        description: input.description,
        lecturerId: input.lecturerId,
        status: input.status,
        startDate: input.startDate,
        endDate: input.endDate,
        createdById: input.createdById
      }
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new AppError("CONFLICT", "A class with this code already exists.");
    }

    throw error;
  }
}

export async function updateClass(input: {
  classId: string;
  name: string;
  code: string;
  description?: string;
  lecturerId: string;
  status: ClassStatus;
  startDate?: Date;
  endDate?: Date;
}) {
  await assertLecturer(input.lecturerId);

  try {
    return await db.class.update({
      where: { id: input.classId },
      data: {
        name: input.name,
        code: input.code,
        description: input.description,
        lecturerId: input.lecturerId,
        status: input.status,
        startDate: input.startDate,
        endDate: input.endDate
      }
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new AppError("CONFLICT", "A class with this code already exists.");
    }

    throw error;
  }
}

export async function enrollStudent(classId: string, studentId: string) {
  const [teachingClass, student] = await Promise.all([
    db.class.findUnique({ where: { id: classId } }),
    db.user.findUnique({ where: { id: studentId } })
  ]);

  if (!teachingClass) {
    throw new AppError("NOT_FOUND", "Class not found.");
  }

  if (!student || student.role !== UserRole.STUDENT) {
    throw new AppError("BAD_REQUEST", "Only students can be enrolled.");
  }

  return db.classStudent.upsert({
    where: {
      classId_studentId: {
        classId,
        studentId
      }
    },
    update: {
      status: EnrollmentStatus.ACTIVE,
      completedAt: null
    },
    create: {
      classId,
      studentId,
      status: EnrollmentStatus.ACTIVE
    }
  });
}

export async function removeStudent(classId: string, studentId: string) {
  const enrollment = await db.classStudent.findUnique({
    where: {
      classId_studentId: {
        classId,
        studentId
      }
    }
  });

  if (!enrollment) {
    throw new AppError("NOT_FOUND", "Enrollment not found.");
  }

  return db.classStudent.update({
    where: {
      classId_studentId: {
        classId,
        studentId
      }
    },
    data: {
      status: EnrollmentStatus.DROPPED,
      completedAt: null
    }
  });
}
