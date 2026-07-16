import { z } from "zod";

const optionalText = z
  .string()
  .trim()
  .transform((value) => (value.length > 0 ? value : undefined));

const password = z.string().min(8, "Password must be at least 8 characters");

export const updateOwnProfileSchema = z.object({
  name: z.string().trim().min(2, "Name is required"),
  avatarUrl: optionalText.optional()
});

export const changeOwnPasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: password,
    confirmPassword: z.string().min(1, "Confirm your new password")
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"]
  });

export const resetUserPasswordSchema = z
  .object({
    userId: z.string().min(1),
    newPassword: password,
    confirmPassword: z.string().min(1, "Confirm the temporary password")
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"]
  });
