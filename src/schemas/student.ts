import { z } from "zod";

const optionalText = z
  .string()
  .trim()
  .transform((value) => (value.length > 0 ? value : undefined));

export const activityIdSchema = z.object({
  activityId: z.string().min(1)
});

export const submitAssignmentSchema = z.object({
  activityId: z.string().min(1),
  textContent: optionalText.optional(),
  fileUrl: optionalText.optional()
});

export const attemptQuizSchema = z.object({
  activityId: z.string().min(1),
  response: optionalText.optional()
});
