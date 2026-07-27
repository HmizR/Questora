"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import type { LecturerActionState } from "@/app/lecturer/action-state";
import { requireRole } from "@/lib/authorization-service";
import { db } from "@/lib/db";
import { toActionError } from "@/lib/errors";
import { formDataToObject } from "@/lib/form-data";
import {
  buildQuizDefinitionFromForm,
  getQuizMaxScore,
  serializeQuizDefinition
} from "@/lib/quiz";
import {
  activityIdSchema,
  activityPrerequisiteSchema,
  announcementIdSchema,
  clearActivityResourceExtractionSchema,
  clearActivityResourceEmbeddingsSchema,
  connectQuestActivitySchema,
  createAnnouncementSchema,
  createActivityResourceSchema,
  createActivitySchema,
  createModuleSchema,
  createQuestSchema,
  deleteActivityResourceSchema,
  gradeSubmissionSchema,
  moduleIdSchema,
  publishGradeSchema,
  questIdSchema,
  removeActivityPrerequisiteSchema,
  removeQuestActivitySchema,
  retryActivityResourceExtractionSchema,
  retryActivityResourceEmbeddingsSchema,
  returnSubmissionSchema,
  updateAnnouncementSchema,
  updateActivitySchema,
  updateActivityResourceSchema,
  updateModuleSchema,
  updateQuestSchema
} from "@/schemas/lecturer";
import {
  archiveAnnouncement,
  createAnnouncement,
  deleteAnnouncement,
  publishAnnouncement,
  updateAnnouncement
} from "@/services/announcement-service";
import { publishGrade } from "@/services/grade-service";
import {
  addActivityPrerequisite,
  connectActivityToQuest,
  createActivity,
  createActivityResource,
  createModule,
  createQuest,
  deleteActivity,
  deleteActivityResource,
  deleteModule,
  deleteQuest,
  gradeSubmission,
  publishActivity,
  publishModule,
  publishQuest,
  removeActivityPrerequisite,
  removeActivityFromQuest,
  returnSubmissionForRevision,
  updateActivity,
  updateActivityResource,
  updateModule,
  updateQuest
} from "@/services/lecturer-service";
import {
  clearActivityResourceExtraction,
  clearActivityResourceEmbeddingState,
  retryActivityResourceEmbeddings,
  retryActivityResourceExtraction
} from "@/services/resource-text-service";

function validationError(error: z.ZodError): LecturerActionState {
  const fieldErrors = Object.fromEntries(
    Object.entries(error.flatten().fieldErrors).filter(
      (entry): entry is [string, string[]] => Array.isArray(entry[1])
    )
  );

  return {
    ok: false,
    error: {
      code: "VALIDATION_ERROR",
      message: "Please check the highlighted fields.",
      fieldErrors
    }
  };
}

function safeLecturerReturnPath(path?: string) {
  if (!path || !path.startsWith("/lecturer/classes/") || path.startsWith("//")) {
    return undefined;
  }

  return path;
}

function normalizeActivityPayload<T extends { type: string; content?: string; maxScore?: number; passingScore?: number; maxAttempts?: number }>(
  payload: T
) {
  if (payload.type !== "QUIZ") {
    return payload;
  }

  const definition = buildQuizDefinitionFromForm(payload);
  if (!definition) {
    return payload;
  }

  const maxScore = getQuizMaxScore(definition);
  return {
    ...payload,
    content: serializeQuizDefinition(definition),
    maxScore: payload.maxScore ?? maxScore,
    passingScore: payload.passingScore ?? maxScore
  };
}

export async function createModuleAction(
  _state: LecturerActionState,
  formData: FormData
): Promise<LecturerActionState> {
  const parsed = createModuleSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) return validationError(parsed.error);

  let redirectTo: string;
  try {
    const user = await requireRole("LECTURER");
    const learningModule = await createModule({ ...parsed.data, lecturerId: user.id });
    redirectTo = `/lecturer/classes/${parsed.data.classId}/modules/${learningModule.id}/edit`;
    revalidatePath(`/lecturer/classes/${parsed.data.classId}/modules`);
    revalidatePath(redirectTo);
  } catch (error) {
    return { ok: false, error: toActionError(error) };
  }

  redirect(redirectTo);
}

export async function updateModuleAction(
  _state: LecturerActionState,
  formData: FormData
): Promise<LecturerActionState> {
  const parsed = updateModuleSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) return validationError(parsed.error);

  let redirectTo: string;
  try {
    const user = await requireRole("LECTURER");
    await updateModule({ ...parsed.data, lecturerId: user.id });
    redirectTo = `/lecturer/classes/${parsed.data.classId}/modules`;
    revalidatePath(redirectTo);
  } catch (error) {
    return { ok: false, error: toActionError(error) };
  }

  redirect(redirectTo);
}

export async function publishModuleAction(
  _state: LecturerActionState,
  formData: FormData
): Promise<LecturerActionState> {
  const parsed = moduleIdSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) return validationError(parsed.error);

  try {
    const user = await requireRole("LECTURER");
    await publishModule(parsed.data.moduleId, user.id);
    revalidatePath("/lecturer/classes");
    return { ok: true, data: { message: "Region published." } };
  } catch (error) {
    return { ok: false, error: toActionError(error) };
  }
}

export async function deleteModuleAction(
  _state: LecturerActionState,
  formData: FormData
): Promise<LecturerActionState> {
  const parsed = moduleIdSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) return validationError(parsed.error);

  try {
    const user = await requireRole("LECTURER");
    await deleteModule(parsed.data.moduleId, user.id);
    revalidatePath("/lecturer/classes");
    return { ok: true, data: { message: "Region deleted." } };
  } catch (error) {
    return { ok: false, error: toActionError(error) };
  }
}

export async function createActivityAction(
  _state: LecturerActionState,
  formData: FormData
): Promise<LecturerActionState> {
  const parsed = createActivitySchema.safeParse(formDataToObject(formData));
  if (!parsed.success) return validationError(parsed.error);

  let redirectTo: string;
  try {
    const user = await requireRole("LECTURER");
    const activity = await createActivity({
      ...normalizeActivityPayload(parsed.data),
      lecturerId: user.id
    });
    const learningModule = await db.module.findUnique({
      where: { id: activity.moduleId },
      select: { classId: true }
    });
    redirectTo = learningModule
      ? `/lecturer/classes/${learningModule.classId}/modules/${activity.moduleId}/activities/${activity.id}/edit`
      : "/lecturer/classes";
    if (learningModule) {
      revalidatePath(`/lecturer/classes/${learningModule.classId}/modules`);
    }
    revalidatePath(redirectTo);
  } catch (error) {
    return { ok: false, error: toActionError(error) };
  }

  redirect(redirectTo);
}

export async function updateActivityAction(
  _state: LecturerActionState,
  formData: FormData
): Promise<LecturerActionState> {
  const parsed = updateActivitySchema.safeParse(formDataToObject(formData));
  if (!parsed.success) return validationError(parsed.error);

  let redirectTo: string;
  try {
    const user = await requireRole("LECTURER");
    const activity = await updateActivity({
      ...normalizeActivityPayload(parsed.data),
      lecturerId: user.id
    });
    const learningModule = await db.module.findUnique({
      where: { id: activity.moduleId },
      select: { classId: true }
    });
    redirectTo = learningModule
      ? `/lecturer/classes/${learningModule.classId}/modules`
      : "/lecturer/classes";
    revalidatePath(redirectTo);
  } catch (error) {
    return { ok: false, error: toActionError(error) };
  }

  redirect(redirectTo);
}

export async function publishActivityAction(
  _state: LecturerActionState,
  formData: FormData
): Promise<LecturerActionState> {
  const parsed = activityIdSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) return validationError(parsed.error);

  try {
    const user = await requireRole("LECTURER");
    await publishActivity(parsed.data.activityId, user.id);
    revalidatePath("/lecturer/classes");
    return { ok: true, data: { message: "Mission published." } };
  } catch (error) {
    return { ok: false, error: toActionError(error) };
  }
}

export async function deleteActivityAction(
  _state: LecturerActionState,
  formData: FormData
): Promise<LecturerActionState> {
  const parsed = activityIdSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) return validationError(parsed.error);

  try {
    const user = await requireRole("LECTURER");
    await deleteActivity(parsed.data.activityId, user.id);
    revalidatePath("/lecturer/classes");
    return { ok: true, data: { message: "Mission deleted." } };
  } catch (error) {
    return { ok: false, error: toActionError(error) };
  }
}

export async function addActivityPrerequisiteAction(
  _state: LecturerActionState,
  formData: FormData
): Promise<LecturerActionState> {
  const parsed = activityPrerequisiteSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) return validationError(parsed.error);

  try {
    const user = await requireRole("LECTURER");
    await addActivityPrerequisite({ ...parsed.data, lecturerId: user.id });
    revalidatePath(`/lecturer/classes/${parsed.data.classId}/modules`);
    return { ok: true, data: { message: "Prerequisite saved." } };
  } catch (error) {
    return { ok: false, error: toActionError(error) };
  }
}

export async function removeActivityPrerequisiteAction(
  _state: LecturerActionState,
  formData: FormData
): Promise<LecturerActionState> {
  const parsed = removeActivityPrerequisiteSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) return validationError(parsed.error);

  try {
    const user = await requireRole("LECTURER");
    await removeActivityPrerequisite({ ...parsed.data, lecturerId: user.id });
    revalidatePath(`/lecturer/classes/${parsed.data.classId}/modules`);
    return { ok: true, data: { message: "Prerequisite removed." } };
  } catch (error) {
    return { ok: false, error: toActionError(error) };
  }
}

export async function createActivityResourceAction(
  _state: LecturerActionState,
  formData: FormData
): Promise<LecturerActionState> {
  const parsed = createActivityResourceSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) return validationError(parsed.error);

  try {
    const user = await requireRole("LECTURER");
    await createActivityResource({ ...parsed.data, lecturerId: user.id });
    revalidatePath(`/lecturer/classes/${parsed.data.classId}/modules`);
    revalidatePath(
      `/lecturer/classes/${parsed.data.classId}/modules/${parsed.data.moduleId}/activities/${parsed.data.activityId}/edit`
    );
    return { ok: true, data: { message: "Resource added." } };
  } catch (error) {
    return { ok: false, error: toActionError(error) };
  }
}

export async function deleteActivityResourceAction(
  _state: LecturerActionState,
  formData: FormData
): Promise<LecturerActionState> {
  const parsed = deleteActivityResourceSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) return validationError(parsed.error);

  try {
    const user = await requireRole("LECTURER");
    await deleteActivityResource({ ...parsed.data, lecturerId: user.id });
    revalidatePath(`/lecturer/classes/${parsed.data.classId}/modules`);
    revalidatePath(
      `/lecturer/classes/${parsed.data.classId}/modules/${parsed.data.moduleId}/activities/${parsed.data.activityId}/edit`
    );
    return { ok: true, data: { message: "Resource removed." } };
  } catch (error) {
    return { ok: false, error: toActionError(error) };
  }
}

export async function updateActivityResourceAction(
  _state: LecturerActionState,
  formData: FormData
): Promise<LecturerActionState> {
  const parsed = updateActivityResourceSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) return validationError(parsed.error);

  try {
    const user = await requireRole("LECTURER");
    await updateActivityResource({ ...parsed.data, lecturerId: user.id });
    revalidatePath(`/lecturer/classes/${parsed.data.classId}/modules`);
    revalidatePath(
      `/lecturer/classes/${parsed.data.classId}/modules/${parsed.data.moduleId}/activities/${parsed.data.activityId}/edit`
    );
    return { ok: true, data: { message: "Resource details updated." } };
  } catch (error) {
    return { ok: false, error: toActionError(error) };
  }
}

export async function retryActivityResourceExtractionAction(
  _state: LecturerActionState,
  formData: FormData
): Promise<LecturerActionState> {
  const parsed = retryActivityResourceExtractionSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) return validationError(parsed.error);

  try {
    const user = await requireRole("LECTURER");
    await retryActivityResourceExtraction({ ...parsed.data, lecturerId: user.id });
    revalidatePath(`/lecturer/classes/${parsed.data.classId}/modules`);
    revalidatePath(
      `/lecturer/classes/${parsed.data.classId}/modules/${parsed.data.moduleId}/activities/${parsed.data.activityId}/edit`
    );
    return { ok: true, data: { message: "Resource text extraction retried." } };
  } catch (error) {
    return { ok: false, error: toActionError(error) };
  }
}

export async function clearActivityResourceExtractionAction(
  _state: LecturerActionState,
  formData: FormData
): Promise<LecturerActionState> {
  const parsed = clearActivityResourceExtractionSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) return validationError(parsed.error);

  try {
    const user = await requireRole("LECTURER");
    await clearActivityResourceExtraction({ ...parsed.data, lecturerId: user.id });
    revalidatePath(`/lecturer/classes/${parsed.data.classId}/modules`);
    revalidatePath(
      `/lecturer/classes/${parsed.data.classId}/modules/${parsed.data.moduleId}/activities/${parsed.data.activityId}/edit`
    );
    return { ok: true, data: { message: "Extracted text cleared." } };
  } catch (error) {
    return { ok: false, error: toActionError(error) };
  }
}

export async function retryActivityResourceEmbeddingsAction(
  _state: LecturerActionState,
  formData: FormData
): Promise<LecturerActionState> {
  const parsed = retryActivityResourceEmbeddingsSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) return validationError(parsed.error);

  try {
    const user = await requireRole("LECTURER");
    await retryActivityResourceEmbeddings({ ...parsed.data, lecturerId: user.id });
    revalidatePath(`/lecturer/classes/${parsed.data.classId}/modules`);
    revalidatePath(
      `/lecturer/classes/${parsed.data.classId}/modules/${parsed.data.moduleId}/activities/${parsed.data.activityId}/edit`
    );
    return { ok: true, data: { message: "Resource search embeddings retried." } };
  } catch (error) {
    return { ok: false, error: toActionError(error) };
  }
}

export async function clearActivityResourceEmbeddingsAction(
  _state: LecturerActionState,
  formData: FormData
): Promise<LecturerActionState> {
  const parsed = clearActivityResourceEmbeddingsSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) return validationError(parsed.error);

  try {
    const user = await requireRole("LECTURER");
    await clearActivityResourceEmbeddingState({ ...parsed.data, lecturerId: user.id });
    revalidatePath(`/lecturer/classes/${parsed.data.classId}/modules`);
    revalidatePath(
      `/lecturer/classes/${parsed.data.classId}/modules/${parsed.data.moduleId}/activities/${parsed.data.activityId}/edit`
    );
    return { ok: true, data: { message: "Resource search embeddings cleared." } };
  } catch (error) {
    return { ok: false, error: toActionError(error) };
  }
}

export async function createAnnouncementAction(
  _state: LecturerActionState,
  formData: FormData
): Promise<LecturerActionState> {
  const parsed = createAnnouncementSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) return validationError(parsed.error);

  let redirectTo: string;
  try {
    const user = await requireRole("LECTURER");
    const announcement = await createAnnouncement({ ...parsed.data, lecturerId: user.id });
    redirectTo = `/lecturer/classes/${parsed.data.classId}/announcements/${announcement.id}/edit`;
    revalidatePath(`/lecturer/classes/${parsed.data.classId}/announcements`);
    revalidatePath(redirectTo);
    revalidatePath(`/lecturer/classes/${parsed.data.classId}`);
  } catch (error) {
    return { ok: false, error: toActionError(error) };
  }

  redirect(redirectTo);
}

export async function updateAnnouncementAction(
  _state: LecturerActionState,
  formData: FormData
): Promise<LecturerActionState> {
  const parsed = updateAnnouncementSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) return validationError(parsed.error);

  let redirectTo: string;
  try {
    const user = await requireRole("LECTURER");
    await updateAnnouncement({ ...parsed.data, lecturerId: user.id });
    redirectTo = `/lecturer/classes/${parsed.data.classId}/announcements`;
    revalidatePath(redirectTo);
    revalidatePath(`/lecturer/classes/${parsed.data.classId}`);
  } catch (error) {
    return { ok: false, error: toActionError(error) };
  }

  redirect(redirectTo);
}

export async function publishAnnouncementAction(
  _state: LecturerActionState,
  formData: FormData
): Promise<LecturerActionState> {
  const parsed = announcementIdSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) return validationError(parsed.error);

  try {
    const user = await requireRole("LECTURER");
    await publishAnnouncement({ ...parsed.data, lecturerId: user.id });
    revalidatePath(`/lecturer/classes/${parsed.data.classId}/announcements`);
    revalidatePath(`/lecturer/classes/${parsed.data.classId}`);
    return { ok: true, data: { message: "Announcement published." } };
  } catch (error) {
    return { ok: false, error: toActionError(error) };
  }
}

export async function archiveAnnouncementAction(
  _state: LecturerActionState,
  formData: FormData
): Promise<LecturerActionState> {
  const parsed = announcementIdSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) return validationError(parsed.error);

  try {
    const user = await requireRole("LECTURER");
    await archiveAnnouncement({ ...parsed.data, lecturerId: user.id });
    revalidatePath(`/lecturer/classes/${parsed.data.classId}/announcements`);
    revalidatePath(`/lecturer/classes/${parsed.data.classId}`);
    return { ok: true, data: { message: "Announcement archived." } };
  } catch (error) {
    return { ok: false, error: toActionError(error) };
  }
}

export async function deleteAnnouncementAction(
  _state: LecturerActionState,
  formData: FormData
): Promise<LecturerActionState> {
  const parsed = announcementIdSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) return validationError(parsed.error);

  try {
    const user = await requireRole("LECTURER");
    await deleteAnnouncement({ ...parsed.data, lecturerId: user.id });
    revalidatePath(`/lecturer/classes/${parsed.data.classId}/announcements`);
    revalidatePath(`/lecturer/classes/${parsed.data.classId}`);
    return { ok: true, data: { message: "Announcement deleted." } };
  } catch (error) {
    return { ok: false, error: toActionError(error) };
  }
}

export async function createQuestAction(
  _state: LecturerActionState,
  formData: FormData
): Promise<LecturerActionState> {
  const parsed = createQuestSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) return validationError(parsed.error);

  let redirectTo: string;
  try {
    const user = await requireRole("LECTURER");
    const quest = await createQuest({ ...parsed.data, lecturerId: user.id });
    redirectTo = `/lecturer/classes/${parsed.data.classId}/quests/${quest.id}/edit`;
    revalidatePath(`/lecturer/classes/${parsed.data.classId}/quests`);
    revalidatePath(redirectTo);
  } catch (error) {
    return { ok: false, error: toActionError(error) };
  }

  redirect(redirectTo);
}

export async function updateQuestAction(
  _state: LecturerActionState,
  formData: FormData
): Promise<LecturerActionState> {
  const parsed = updateQuestSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) return validationError(parsed.error);

  let redirectTo: string;
  try {
    const user = await requireRole("LECTURER");
    await updateQuest({ ...parsed.data, lecturerId: user.id });
    redirectTo = `/lecturer/classes/${parsed.data.classId}/quests`;
    revalidatePath(redirectTo);
  } catch (error) {
    return { ok: false, error: toActionError(error) };
  }

  redirect(redirectTo);
}

export async function publishQuestAction(
  _state: LecturerActionState,
  formData: FormData
): Promise<LecturerActionState> {
  const parsed = questIdSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) return validationError(parsed.error);

  try {
    const user = await requireRole("LECTURER");
    await publishQuest(parsed.data.questId, user.id);
    revalidatePath("/lecturer/classes");
    return { ok: true, data: { message: "Quest published." } };
  } catch (error) {
    return { ok: false, error: toActionError(error) };
  }
}

export async function deleteQuestAction(
  _state: LecturerActionState,
  formData: FormData
): Promise<LecturerActionState> {
  const parsed = questIdSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) return validationError(parsed.error);

  try {
    const user = await requireRole("LECTURER");
    await deleteQuest(parsed.data.questId, user.id);
    revalidatePath("/lecturer/classes");
    return { ok: true, data: { message: "Quest deleted." } };
  } catch (error) {
    return { ok: false, error: toActionError(error) };
  }
}

export async function connectQuestActivityAction(
  _state: LecturerActionState,
  formData: FormData
): Promise<LecturerActionState> {
  const parsed = connectQuestActivitySchema.safeParse(formDataToObject(formData));
  if (!parsed.success) return validationError(parsed.error);

  try {
    const user = await requireRole("LECTURER");
    await connectActivityToQuest({ ...parsed.data, lecturerId: user.id });
    revalidatePath(`/lecturer/classes/${parsed.data.classId}/quests`);
    return { ok: true, data: { message: "Mission connected to quest." } };
  } catch (error) {
    return { ok: false, error: toActionError(error) };
  }
}

export async function removeQuestActivityAction(
  _state: LecturerActionState,
  formData: FormData
): Promise<LecturerActionState> {
  const parsed = removeQuestActivitySchema.safeParse(formDataToObject(formData));
  if (!parsed.success) return validationError(parsed.error);

  try {
    const user = await requireRole("LECTURER");
    await removeActivityFromQuest({ ...parsed.data, lecturerId: user.id });
    revalidatePath(`/lecturer/classes/${parsed.data.classId}/quests`);
    return { ok: true, data: { message: "Mission removed from quest." } };
  } catch (error) {
    return { ok: false, error: toActionError(error) };
  }
}

export async function gradeSubmissionAction(
  _state: LecturerActionState,
  formData: FormData
): Promise<LecturerActionState> {
  const parsed = gradeSubmissionSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) return validationError(parsed.error);

  const returnTo = safeLecturerReturnPath(parsed.data.returnTo);
  try {
    const user = await requireRole("LECTURER");
    await gradeSubmission({ ...parsed.data, lecturerId: user.id });
    revalidatePath(returnTo ?? "/lecturer/classes");
  } catch (error) {
    return { ok: false, error: toActionError(error) };
  }

  if (returnTo) {
    redirect(returnTo);
  }

  return { ok: true, data: { message: "Submission graded." } };
}

export async function returnSubmissionAction(
  _state: LecturerActionState,
  formData: FormData
): Promise<LecturerActionState> {
  const parsed = returnSubmissionSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) return validationError(parsed.error);

  const returnTo = safeLecturerReturnPath(parsed.data.returnTo);
  try {
    const user = await requireRole("LECTURER");
    await returnSubmissionForRevision({ ...parsed.data, lecturerId: user.id });
    revalidatePath(returnTo ?? "/lecturer/classes");
  } catch (error) {
    return { ok: false, error: toActionError(error) };
  }

  if (returnTo) {
    redirect(returnTo);
  }

  return { ok: true, data: { message: "Submission returned for revision." } };
}

export async function publishGradeAction(
  _state: LecturerActionState,
  formData: FormData
): Promise<LecturerActionState> {
  const parsed = publishGradeSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) return validationError(parsed.error);

  const returnTo = safeLecturerReturnPath(parsed.data.returnTo);
  try {
    const user = await requireRole("LECTURER");
    await publishGrade(parsed.data.gradeId, user.id);
    revalidatePath(returnTo ?? "/lecturer/classes");
  } catch (error) {
    return { ok: false, error: toActionError(error) };
  }

  if (returnTo) {
    redirect(returnTo);
  }

  return { ok: true, data: { message: "Grade published." } };
}
