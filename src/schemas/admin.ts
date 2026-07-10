import { ClassStatus, UserRole, UserStatus } from "@prisma/client";
import { z } from "zod";

const optionalText = z
  .string()
  .trim()
  .transform((value) => (value.length > 0 ? value : undefined));

const optionalDate = z
  .string()
  .trim()
  .transform((value) => (value.length > 0 ? new Date(value) : undefined))
  .refine((value) => value === undefined || !Number.isNaN(value.getTime()), {
    message: "Invalid date"
  });

export const createUserSchema = z.object({
  name: z.string().trim().min(2, "Name is required"),
  email: z.string().trim().email().transform((value) => value.toLowerCase()),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.nativeEnum(UserRole),
  status: z.nativeEnum(UserStatus).default(UserStatus.ACTIVE),
  avatarUrl: optionalText.optional()
});

export const updateUserSchema = z.object({
  userId: z.string().min(1),
  name: z.string().trim().min(2, "Name is required"),
  email: z.string().trim().email().transform((value) => value.toLowerCase()),
  role: z.nativeEnum(UserRole),
  status: z.nativeEnum(UserStatus),
  avatarUrl: optionalText.optional()
});

export const deactivateUserSchema = z.object({
  userId: z.string().min(1)
});

export const createClassSchema = z.object({
  name: z.string().trim().min(2, "Class name is required"),
  code: z.string().trim().min(2, "Class code is required").transform((value) => value.toUpperCase()),
  description: optionalText.optional(),
  lecturerId: z.string().min(1, "Lecturer is required"),
  status: z.nativeEnum(ClassStatus).default(ClassStatus.DRAFT),
  startDate: optionalDate.optional(),
  endDate: optionalDate.optional()
});

export const updateClassSchema = createClassSchema.extend({
  classId: z.string().min(1)
});

export const enrollStudentSchema = z.object({
  classId: z.string().min(1),
  studentId: z.string().min(1)
});

export const removeStudentSchema = z.object({
  classId: z.string().min(1),
  studentId: z.string().min(1)
});
