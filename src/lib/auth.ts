import NextAuth, { CredentialsSignin, type DefaultSession } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { UserRole, UserStatus } from "@prisma/client";
import { z } from "zod";

import { db } from "@/lib/db";
import { verifyPassword } from "@/lib/password";
import {
  buildLoginRateLimitKey,
  clearAttempts,
  isRateLimited,
  RateLimitUnavailableError,
  recordFailedAttempt
} from "@/lib/rate-limit";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

class RateLimitedSigninError extends CredentialsSignin {
  code = "rate_limited";
}

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: UserRole;
      status: UserStatus;
    } & DefaultSession["user"];
  }

  interface User {
    role: UserRole;
    status: UserStatus;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: UserRole;
    status: UserStatus;
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: {
    strategy: "jwt"
  },
  pages: {
    signIn: "/login"
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      authorize: async (credentials) => {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) {
          return null;
        }

        const email = parsed.data.email.toLowerCase();
        const rateLimitKey = buildLoginRateLimitKey(email);

        try {
          if (await isRateLimited(rateLimitKey)) {
            throw new RateLimitedSigninError();
          }

          const user = await db.user.findUnique({
            where: { email }
          });

          if (!user || user.status !== "ACTIVE") {
            await recordFailedAttempt(rateLimitKey);
            return null;
          }

          const isValid = await verifyPassword(parsed.data.password, user.passwordHash);
          if (!isValid) {
            await recordFailedAttempt(rateLimitKey);
            return null;
          }

          await clearAttempts(rateLimitKey);

          return {
            id: user.id,
            name: user.name,
            email: user.email,
            image: user.avatarUrl,
            role: user.role,
            status: user.status
          };
        } catch (error) {
          if (error instanceof RateLimitUnavailableError) {
            return null;
          }

          throw error;
        }
      }
    })
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.status = user.status;
      }

      return token;
    },
    session({ session, token }) {
      session.user.id = token.sub ?? "";
      session.user.role = token.role;
      session.user.status = token.status;
      return session;
    }
  }
});
