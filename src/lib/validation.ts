import { z } from "zod";

export const cuidSchema = z.string().min(1);

export const loginInputSchema = z.object({
  email: z.string().email().transform((value) => value.toLowerCase()),
  password: z.string().min(1, "Password is required")
});
