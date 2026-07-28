import { ActivityResourceKind, ActivityType, AnnouncementStatus, QuestType } from "@prisma/client";
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

const optionalPositiveInt = z
  .string()
  .trim()
  .transform((value) => (value.length > 0 ? Number(value) : undefined))
  .refine((value) => value === undefined || (Number.isInteger(value) && value > 0), {
    message: "Enter a positive whole number"
  });

const optionalQuizField = z.string().optional();

const quizFields = {
  quizQuestion1Type: optionalQuizField,
  quizQuestion1Prompt: optionalQuizField,
  quizQuestion1Option1: optionalQuizField,
  quizQuestion1Option2: optionalQuizField,
  quizQuestion1Option3: optionalQuizField,
  quizQuestion1Option4: optionalQuizField,
  quizQuestion1CorrectOption: optionalQuizField,
  quizQuestion1Points: optionalQuizField,
  quizQuestion2Type: optionalQuizField,
  quizQuestion2Prompt: optionalQuizField,
  quizQuestion2Option1: optionalQuizField,
  quizQuestion2Option2: optionalQuizField,
  quizQuestion2Option3: optionalQuizField,
  quizQuestion2Option4: optionalQuizField,
  quizQuestion2CorrectOption: optionalQuizField,
  quizQuestion2Points: optionalQuizField,
  quizQuestion3Type: optionalQuizField,
  quizQuestion3Prompt: optionalQuizField,
  quizQuestion3Option1: optionalQuizField,
  quizQuestion3Option2: optionalQuizField,
  quizQuestion3Option3: optionalQuizField,
  quizQuestion3Option4: optionalQuizField,
  quizQuestion3CorrectOption: optionalQuizField,
  quizQuestion3Points: optionalQuizField,
  quizQuestion4Type: optionalQuizField,
  quizQuestion4Prompt: optionalQuizField,
  quizQuestion4Option1: optionalQuizField,
  quizQuestion4Option2: optionalQuizField,
  quizQuestion4Option3: optionalQuizField,
  quizQuestion4Option4: optionalQuizField,
  quizQuestion4CorrectOption: optionalQuizField,
  quizQuestion4Points: optionalQuizField,
  quizQuestion5Type: optionalQuizField,
  quizQuestion5Prompt: optionalQuizField,
  quizQuestion5Option1: optionalQuizField,
  quizQuestion5Option2: optionalQuizField,
  quizQuestion5Option3: optionalQuizField,
  quizQuestion5Option4: optionalQuizField,
  quizQuestion5CorrectOption: optionalQuizField,
  quizQuestion5Points: optionalQuizField
};

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
  maxAttempts: optionalPositiveInt.optional(),
  dueAt: optionalDate.optional(),
  isRequired: checkbox.default(false),
  isPublished: checkbox.default(false),
  ...quizFields
});

export const updateActivitySchema = createActivitySchema.extend({
  activityId: z.string().min(1)
});

export const activityIdSchema = z.object({
  activityId: z.string().min(1)
});

export const activityPrerequisiteSchema = z.object({
  classId: z.string().min(1),
  activityId: z.string().min(1),
  requiredActivityId: z.string().min(1),
  minimumScore: optionalDecimal.optional()
});

export const removeActivityPrerequisiteSchema = z.object({
  classId: z.string().min(1),
  activityId: z.string().min(1),
  requiredActivityId: z.string().min(1)
});

export const createActivityResourceSchema = z.object({
  classId: z.string().min(1),
  moduleId: z.string().min(1),
  activityId: z.string().min(1),
  title: z.string().trim().min(2, "Title is required"),
  description: optionalText.optional(),
  kind: z.nativeEnum(ActivityResourceKind).default(ActivityResourceKind.OTHER),
  isRequired: checkbox.default(false),
  fileName: z.string().trim().min(1, "File name is required").max(180),
  fileUrl: z.string().trim().min(1, "Upload or paste a file reference first"),
  contentType: z.string().trim().min(1).max(120),
  size: z.coerce.number().int().nonnegative(),
  position: z.coerce.number().int().positive()
});

export const updateActivityResourceSchema = z.object({
  classId: z.string().min(1),
  moduleId: z.string().min(1),
  activityId: z.string().min(1),
  resourceId: z.string().min(1),
  title: z.string().trim().min(2, "Title is required"),
  description: optionalText.optional(),
  kind: z.nativeEnum(ActivityResourceKind),
  isRequired: checkbox.default(false),
  position: z.coerce.number().int().positive()
});

export const deleteActivityResourceSchema = z.object({
  classId: z.string().min(1),
  moduleId: z.string().min(1),
  activityId: z.string().min(1),
  resourceId: z.string().min(1)
});

export const retryActivityResourceExtractionSchema = z.object({
  classId: z.string().min(1),
  moduleId: z.string().min(1),
  activityId: z.string().min(1),
  resourceId: z.string().min(1)
});

export const clearActivityResourceExtractionSchema = retryActivityResourceExtractionSchema;

export const retryActivityResourceEmbeddingsSchema = retryActivityResourceExtractionSchema;

export const clearActivityResourceEmbeddingsSchema = retryActivityResourceExtractionSchema;

export const createAnnouncementSchema = z.object({
  classId: z.string().min(1),
  title: z.string().trim().min(2, "Title is required").max(140, "Keep titles under 140 characters."),
  body: z.string().trim().min(2, "Body is required").max(5000, "Keep announcements under 5000 characters."),
  status: z.enum([AnnouncementStatus.DRAFT, AnnouncementStatus.PUBLISHED]).default(AnnouncementStatus.DRAFT)
});

export const updateAnnouncementSchema = createAnnouncementSchema
  .extend({
    announcementId: z.string().min(1)
  })
  .extend({
    status: z.nativeEnum(AnnouncementStatus)
  });

export const announcementIdSchema = z.object({
  classId: z.string().min(1),
  announcementId: z.string().min(1)
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
  classId: z.string().min(1),
  questId: z.string().min(1),
  activityId: z.string().min(1),
  position: z.coerce.number().int().positive()
});

export const removeQuestActivitySchema = z.object({
  classId: z.string().min(1),
  questId: z.string().min(1),
  activityId: z.string().min(1)
});

export const gradeSubmissionSchema = z.object({
  submissionId: z.string().min(1),
  score: z.coerce.number().min(0),
  feedback: optionalText.optional(),
  returnTo: optionalText.optional()
});

export const createRubricCriterionSchema = z.object({
  classId: z.string().min(1),
  moduleId: z.string().min(1),
  activityId: z.string().min(1),
  title: z.string().trim().min(2, "Criterion title is required"),
  description: optionalText.optional(),
  maxPoints: z.coerce.number().positive("Max points must be greater than zero"),
  position: z.coerce.number().int().positive()
});

export const updateRubricCriterionSchema = createRubricCriterionSchema.extend({
  criterionId: z.string().min(1)
});

export const deleteRubricCriterionSchema = z.object({
  classId: z.string().min(1),
  moduleId: z.string().min(1),
  activityId: z.string().min(1),
  criterionId: z.string().min(1)
});

export const gradeSubmissionWithRubricSchema = z.object({
  submissionId: z.string().min(1),
  criterionIds: z.string().trim().min(1, "Rubric criteria are required"),
  overallFeedback: optionalText.optional(),
  returnTo: optionalText.optional()
});

export const returnSubmissionSchema = z.object({
  submissionId: z.string().min(1),
  returnFeedback: z.string().trim().min(2, "Revision feedback is required."),
  returnTo: optionalText.optional()
});

export const publishGradeSchema = z.object({
  gradeId: z.string().min(1),
  returnTo: optionalText.optional()
});
