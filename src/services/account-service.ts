import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { hashPassword, verifyPassword } from "@/lib/password";

export async function updateOwnProfile(input: {
  userId: string;
  name: string;
  avatarUrl?: string;
}) {
  return db.user.update({
    where: { id: input.userId },
    data: {
      name: input.name,
      avatarUrl: input.avatarUrl
    }
  });
}

export async function changeOwnPassword(input: {
  userId: string;
  currentPassword: string;
  newPassword: string;
}) {
  const user = await db.user.findUnique({
    where: { id: input.userId },
    select: { passwordHash: true }
  });

  if (!user) {
    throw new AppError("NOT_FOUND", "User not found.");
  }

  const isValid = await verifyPassword(input.currentPassword, user.passwordHash);
  if (!isValid) {
    throw new AppError("FORBIDDEN", "Current password is incorrect.");
  }

  await db.user.update({
    where: { id: input.userId },
    data: {
      passwordHash: await hashPassword(input.newPassword)
    }
  });
}
