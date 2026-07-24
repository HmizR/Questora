import { NextResponse } from "next/server";
import { z } from "zod";

import {
  buildLoginRateLimitKey,
  isRateLimited,
  RateLimitUnavailableError
} from "@/lib/rate-limit";

const statusSchema = z.object({
  email: z.string().email()
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = statusSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ rateLimited: false }, { status: 400 });
  }

  try {
    return NextResponse.json({
      rateLimited: await isRateLimited(buildLoginRateLimitKey(parsed.data.email))
    });
  } catch (error) {
    if (error instanceof RateLimitUnavailableError) {
      return NextResponse.json({ rateLimited: true });
    }

    throw error;
  }
}
