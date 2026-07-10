import { ActivityType, QuestType } from "@prisma/client";
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

const checkbox = z.preprocess((value) => value === "on" || value === true, z.boolean());

const optionalDecimal = z
  .string()
  .trim()
  .transform((value) => (value.length > 0 ? Number(value) : undefined))
  .refine((value) => value === undefined || Number.isFinite(value), {
    message: "Enter a valid number"
  });

export const createModuleSchema = z.object({
  classId: z.string().min(1),
  title: z.string().trim().min(2, "Title is required"),
  description: optionalText.optional(),
  position: z.coerce.number().int().positive(),
  isPublished: checkbox.default(false),
  availableFrom: optionalDate.optional()
});

export const updateModuleSchema = createModuleSchema.extend({
  moduleId: z.string().min(1)
});

export const moduleIdSchema = z.object({
  moduleId: z.string().min(1)
});

export const createActivitySchema = z.object({
  moduleId: z.string().min(1),
  type: z.nativeEnum(ActivityType),
  title: z.string().trim().min(2, "Title is required"),
  description: optionalText.optional(),
  content: optionalText.optional(),
  position: z.coerce.number().int().positive(),
  maxScore: optionalDecimal.optional(),
  passingScore: optionalDecimal.optional(),
  dueAt: optionalDate.optional(),
  isRequired: checkbox.default(false),
  isPublished: checkbox.default(false)
});

export const updateActivitySchema = createActivitySchema.extend({
  activityId: z.string().min(1)
});

export const activityIdSchema = z.object({
  activityId: z.string().min(1)
});

export const createQuestSchema = z.object({
  classId: z.string().min(1),
  title: z.string().trim().min(2, "Title is required"),
  description: optionalText.optional(),
  type: z.nativeEnum(QuestType),
  position: z.coerce.number().int().positive(),
  xpReward: z.coerce.number().int().min(0),
  isOptional: checkbox.default(false),
  isPublished: checkbox.default(false)
});

export const updateQuestSchema = createQuestSchema.extend({
  questId: z.string().min(1)
});

export const questIdSchema = z.object({
  questId: z.string().min(1)
});

export const connectQuestActivitySchema = z.object({
  questId: z.string().min(1),
  activityId: z.string().min(1),
  position: z.coerce.number().int().positive()
});

export const gradeSubmissionSchema = z.object({
  submissionId: z.string().min(1),
  score: z.coerce.number().min(0),
  feedback: optionalText.optional()
});

export const publishGradeSchema = z.object({
  gradeId: z.string().min(1)
});
