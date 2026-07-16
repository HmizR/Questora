import { Prisma, UserRole, UserStatus } from "@prisma/client";

import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { hashPassword } from "@/lib/password";

export async function createUser(input: {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  status: UserStatus;
  avatarUrl?: string;
}) {
  try {
    return await db.user.create({
      data: {
        name: input.name,
        email: input.email,
        passwordHash: await hashPassword(input.password),
        role: input.role,
        status: input.status,
        avatarUrl: input.avatarUrl,
        profile:
          input.role === UserRole.STUDENT
            ? {
                create: {
                  totalXp: 0,
                  level: 1
                }
              }
            : undefined
      }
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new AppError("CONFLICT", "A user with this email already exists.");
    }

    throw error;
  }
}

export async function updateUser(input: {
  userId: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  avatarUrl?: string;
}) {
  try {
    return await db.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: { id: input.userId },
        data: {
          name: input.name,
          email: input.email,
          role: input.role,
          status: input.status,
          avatarUrl: input.avatarUrl
        }
      });

      if (input.role === UserRole.STUDENT) {
        await tx.studentProfile.upsert({
          where: { studentId: input.userId },
          update: {},
          create: {
            studentId: input.userId,
            totalXp: 0,
            level: 1
          }
        });
      }

      return user;
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new AppError("CONFLICT", "A user with this email already exists.");
    }

    throw error;
  }
}

export async function deactivateUser(userId: string) {
  return db.user.update({
    where: { id: userId },
    data: { status: UserStatus.INACTIVE }
  });
}

export async function resetUserPassword(input: { userId: string; newPassword: string }) {
  return db.user.update({
    where: { id: input.userId },
    data: {
      passwordHash: await hashPassword(input.newPassword)
    }
  });
}
