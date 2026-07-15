import { UserRole, UserStatus } from "@prisma/client";

import { hashPassword } from "../src/lib/password";
import { db } from "../src/lib/db";

function requiredEnv(name: string) {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`${name} is required.`);
  }

  return value;
}

async function main() {
  const name = requiredEnv("BOOTSTRAP_ADMIN_NAME");
  const email = requiredEnv("BOOTSTRAP_ADMIN_EMAIL").toLowerCase();
  const password = requiredEnv("BOOTSTRAP_ADMIN_PASSWORD");

  if (password.length < 12) {
    throw new Error("BOOTSTRAP_ADMIN_PASSWORD must be at least 12 characters.");
  }

  const passwordHash = await hashPassword(password);

  const admin = await db.user.upsert({
    where: { email },
    create: {
      name,
      email,
      passwordHash,
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE
    },
    update: {
      name,
      passwordHash,
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE
    },
    select: {
      id: true,
      email: true,
      role: true,
      status: true
    }
  });

  console.info(`Bootstrap admin ready: ${admin.email} (${admin.role}, ${admin.status})`);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
