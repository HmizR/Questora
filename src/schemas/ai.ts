import { z } from "zod";

export const aiContextSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("GENERIC")
  }),
  z.object({
    type: z.literal("STUDENT_CLASS"),
    classId: z.string().cuid()
  }),
  z.object({
    type: z.literal("STUDENT_ACTIVITY"),
    classId: z.string().cuid(),
    activityId: z.string().cuid()
  })
]);

export const aiChatMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().trim().min(1).max(4000)
});

export const aiChatRequestSchema = z.object({
  message: z.string().trim().min(1, "Ask the assistant something first.").max(2000),
  context: aiContextSchema.default({ type: "GENERIC" }),
  history: z.array(aiChatMessageSchema).max(8).default([])
});

export type AIContextInput = z.infer<typeof aiContextSchema>;
export type AIChatMessageInput = z.infer<typeof aiChatMessageSchema>;
export type AIChatRequestInput = z.infer<typeof aiChatRequestSchema>;
