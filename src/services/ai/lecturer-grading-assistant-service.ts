import { ActivityType } from "@prisma/client";

import { requireRole } from "@/lib/authorization-service";
import { formatDateTime } from "@/lib/date-format";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import {
  formatResourceChunkCitation,
  isSuspiciousExtractedText,
  sanitizeExtractedText
} from "@/lib/resource-text-rules";
import {
  lecturerGradingAssistantRequestSchema,
  type LecturerGradingAssistantRequestInput
} from "@/schemas/ai";
import { getAIProvider } from "@/services/ai/ai-provider";
import { buildLecturerGradingAssistantSystemPrompt } from "@/services/ai/ai-prompts";
import type { AIProvider, AISource } from "@/services/ai/ai-types";
import {
  retrieveRelevantActivityResourceChunks,
  type RetrievedResourceChunk
} from "@/services/ai/resource-retrieval-service";
import { extractTextChunksFromProtectedFile } from "@/services/resource-text-service";

const MAX_CONTEXT_CHARS = 12000;
const MAX_CHUNK_CHARS = 1500;
const MAX_SUBMISSION_TEXT_CHARS = 6000;
const MAX_SUBMISSION_FILE_TEXT_CHARS = 7000;

function compact(value: string | null | undefined) {
  return value?.trim() || "None";
}

function dateOrNone(value: Date | null | undefined) {
  return value ? formatDateTime(value) : "No due date";
}

function truncate(value: string, maxLength: number) {
  return value.length > maxLength ? `${value.slice(0, maxLength)}...` : value;
}

async function retrieveRelevantChunksSafely(params: { activityId: string; query: string }) {
  try {
    return await retrieveRelevantActivityResourceChunks({
      activityId: params.activityId,
      query: params.query,
      limit: 6
    });
  } catch {
    return [];
  }
}

function buildRetrievedResourceContext(chunks: RetrievedResourceChunk[]) {
  let remaining = MAX_CONTEXT_CHARS;
  const excerpts: string[] = [];

  for (const chunk of chunks) {
    if (remaining <= 0) break;
    if (isSuspiciousExtractedText(chunk.content)) continue;

    const sanitizedContent = sanitizeExtractedText(chunk.content).slice(
      0,
      Math.min(MAX_CHUNK_CHARS, remaining)
    );
    if (!sanitizedContent) continue;

    const citation = formatResourceChunkCitation(chunk);
    const prefix = `[Resource: ${chunk.resourceTitle}, ${citation}, ${
      chunk.isRequired ? "required" : "optional"
    }]\n`;
    const available = remaining - prefix.length;
    if (available <= 0) break;

    const content = sanitizedContent.slice(0, available);
    excerpts.push(`${prefix}${content}`);
    remaining -= prefix.length + content.length;
  }

  return excerpts.join("\n\n");
}

function buildFallbackResourceContext(
  resources: Array<{
    title: string;
    isRequired: boolean;
    extractedTexts: Array<{
      chunkIndex: number;
      content: string;
      pageStart: number | null;
      pageEnd: number | null;
      lineStart: number | null;
      lineEnd: number | null;
    }>;
  }>
) {
  const chunks = resources.flatMap((resource) =>
    resource.extractedTexts.map((chunk) => ({
      ...chunk,
      resourceTitle: resource.title,
      isRequired: resource.isRequired,
      id: `${resource.title}:${chunk.chunkIndex}`,
      resourceId: resource.title,
      distance: 0
    }))
  );

  return buildRetrievedResourceContext(chunks);
}

async function buildSubmissionFileContext(input: {
  fileUrl: string | null;
}) {
  if (!input.fileUrl) {
    return {
      context: "No",
      status: "none" as const,
      source: null as AISource | null
    };
  }

  try {
    const extraction = await extractTextChunksFromProtectedFile({
      fileUrl: input.fileUrl
    });

    if (extraction.status === "UNSUPPORTED") {
      return {
        context:
          "Yes. The file type is not text-extractable in this assistant pass, so file contents were not read.",
        status: "unsupported" as const,
        source: null as AISource | null
      };
    }

    const safeChunks = extraction.chunks
      .filter((chunk) => !isSuspiciousExtractedText(chunk.content))
      .map((chunk) => ({
        ...chunk,
        content: sanitizeExtractedText(chunk.content)
      }))
      .filter((chunk) => chunk.content.length > 0);

    if (safeChunks.length === 0) {
      return {
        context:
          "Yes. The assistant attempted to read the file, but no readable text could be extracted.",
        status: "failed" as const,
        source: null as AISource | null
      };
    }

    let remaining = MAX_SUBMISSION_FILE_TEXT_CHARS;
    const excerpts: string[] = [];
    for (const [index, chunk] of safeChunks.entries()) {
      if (remaining <= 0) break;
      const citation = formatResourceChunkCitation({ ...chunk, chunkIndex: index });
      const prefix = `[Submitted file: ${citation}]\n`;
      const available = remaining - prefix.length;
      if (available <= 0) break;
      const content = chunk.content.slice(0, available);
      excerpts.push(`${prefix}${content}`);
      remaining -= prefix.length + content.length;
    }

    return {
      context: `Yes. Extracted text from the submitted file is available:\n${excerpts.join("\n\n")}`,
      status: "ready" as const,
      source: { label: "Submitted file", detail: "Extracted text" } satisfies AISource
    };
  } catch {
    return {
      context:
        "Yes. The assistant could not read the submitted file right now, so review guidance is limited to submission text, mission instructions, and resources.",
      status: "failed" as const,
      source: null as AISource | null
    };
  }
}

export async function createLecturerGradingSuggestion(
  rawInput: LecturerGradingAssistantRequestInput | unknown,
  provider: AIProvider = getAIProvider()
) {
  const input = lecturerGradingAssistantRequestSchema.parse(rawInput);
  const user = await requireRole("LECTURER");

  const submission = await db.submission.findUnique({
    where: { id: input.submissionId },
    include: {
      student: true,
      activity: {
        include: {
          module: {
            include: {
              class: true
            }
          },
          resources: {
            include: {
              extractedTexts: {
                orderBy: { chunkIndex: "asc" }
              }
            },
            orderBy: [{ isRequired: "desc" }, { position: "asc" }]
          }
        }
      }
    }
  });

  if (!submission) {
    throw new AppError("NOT_FOUND", "Submission not found.");
  }

  const { activity } = submission;

  if (activity.module.class.lecturerId !== user.id) {
    throw new AppError("FORBIDDEN", "You can only draft feedback for your own realms.");
  }

  if (activity.type !== ActivityType.ASSIGNMENT && activity.type !== ActivityType.PROJECT) {
    throw new AppError("BAD_REQUEST", "AI feedback drafting is only available for assignments and boss battles.");
  }

  const grade = await db.grade.findUnique({
    where: {
      activityId_studentId: {
        activityId: activity.id,
        studentId: submission.studentId
      }
    }
  });

  const query = [
    activity.title,
    activity.description,
    activity.content,
    submission.textContent
  ]
    .filter(Boolean)
    .join("\n");
  const retrievedChunks = query
    ? await retrieveRelevantChunksSafely({ activityId: activity.id, query })
    : [];
  const resourceContext =
    retrievedChunks.length > 0
      ? buildRetrievedResourceContext(retrievedChunks)
      : buildFallbackResourceContext(activity.resources);
  const submissionFileContext = await buildSubmissionFileContext({
    fileUrl: submission.fileUrl
  });
  const sources: AISource[] = [
    { label: "Mission", detail: activity.title },
    { label: "Student", detail: submission.student.name },
    ...(submissionFileContext.source ? [submissionFileContext.source] : []),
    ...activity.resources.slice(0, 6).map((resource) => ({
      label: "Resource",
      detail: resource.title
    }))
  ];
  const contextText = `
Authorized lecturer grading context:
Realm: ${activity.module.class.name}
Region: ${activity.module.title}
Mission: ${activity.title}
Type: ${activity.type}
Mission description: ${compact(activity.description)}
Mission instructions/content: ${compact(activity.content)}
Due date: ${dateOrNone(activity.dueAt)}
Max score: ${activity.maxScore?.toString() ?? "None"}

Student:
Name: ${submission.student.name}
Email: ${submission.student.email}

Latest submission:
Status: ${submission.status}
Submitted at: ${dateOrNone(submission.submittedAt)}
Text content:
${truncate(compact(submission.textContent), MAX_SUBMISSION_TEXT_CHARS)}
File attached: ${submissionFileContext.context}

Existing grade state:
${grade ? `A grade draft exists. Published: ${grade.publishedAt ? "yes" : "no"}. Existing feedback: ${compact(grade.feedback)}` : "No grade has been saved yet."}

Relevant mission resource excerpts when available:
${resourceContext || "No extracted mission resource text is available."}
`.trim();

  const suggestion = await provider.complete({
    temperature: 0.2,
    messages: [
      { role: "system", content: buildLecturerGradingAssistantSystemPrompt() },
      { role: "user", content: contextText }
    ]
  });

  if (!suggestion.trim()) {
    throw new AppError("BAD_REQUEST", "The AI assistant returned an empty response.");
  }

  return {
    suggestion,
    sources: sources.slice(0, 8)
  };
}
