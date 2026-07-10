"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import type { LecturerActionState } from "@/app/lecturer/action-state";
import { requireRole } from "@/lib/authorization-service";
import { toActionError } from "@/lib/errors";
import { formDataToObject } from "@/lib/form-data";
import {
  activityIdSchema,
  connectQuestActivitySchema,
  createActivitySchema,
  createModuleSchema,
  createQuestSchema,
  gradeSubmissionSchema,
  moduleIdSchema,
  publishGradeSchema,
  questIdSchema,
  updateActivitySchema,
  updateModuleSchema,
  updateQuestSchema
} from "@/schemas/lecturer";
import { publishGrade } from "@/services/grade-service";
import {
  connectActivityToQuest,
  createActivity,
  createModule,
  createQuest,
  deleteActivity,
  deleteModule,
  gradeSubmission,
  publishActivity,
  publishModule,
  publishQuest,
  updateActivity,
  updateModule,
  updateQuest
} from "@/services/lecturer-service";

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

export async function createModuleAction(
  _state: LecturerActionState,
  formData: FormData
): Promise<LecturerActionState> {
  const parsed = createModuleSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) return validationError(parsed.error);

  try {
    const user = await requireRole("LECTURER");
    await createModule({ ...parsed.data, lecturerId: user.id });
    revalidatePath(`/lecturer/classes/${parsed.data.classId}/modules`);
    return { ok: true, data: { message: "Region created." } };
  } catch (error) {
    return { ok: false, error: toActionError(error) };
  }
}

export async function updateModuleAction(
  _state: LecturerActionState,
  formData: FormData
): Promise<LecturerActionState> {
  const parsed = updateModuleSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) return validationError(parsed.error);

  try {
    const user = await requireRole("LECTURER");
    await updateModule({ ...parsed.data, lecturerId: user.id });
    revalidatePath(`/lecturer/classes/${parsed.data.classId}/modules`);
    return { ok: true, data: { message: "Region updated." } };
  } catch (error) {
    return { ok: false, error: toActionError(error) };
  }
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

  try {
    const user = await requireRole("LECTURER");
    await createActivity({ ...parsed.data, lecturerId: user.id });
    revalidatePath("/lecturer/classes");
    return { ok: true, data: { message: "Mission created." } };
  } catch (error) {
    return { ok: false, error: toActionError(error) };
  }
}

export async function updateActivityAction(
  _state: LecturerActionState,
  formData: FormData
): Promise<LecturerActionState> {
  const parsed = updateActivitySchema.safeParse(formDataToObject(formData));
  if (!parsed.success) return validationError(parsed.error);

  try {
    const user = await requireRole("LECTURER");
    await updateActivity({ ...parsed.data, lecturerId: user.id });
    revalidatePath("/lecturer/classes");
    return { ok: true, data: { message: "Mission updated." } };
  } catch (error) {
    return { ok: false, error: toActionError(error) };
  }
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

export async function createQuestAction(
  _state: LecturerActionState,
  formData: FormData
): Promise<LecturerActionState> {
  const parsed = createQuestSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) return validationError(parsed.error);

  try {
    const user = await requireRole("LECTURER");
    await createQuest({ ...parsed.data, lecturerId: user.id });
    revalidatePath(`/lecturer/classes/${parsed.data.classId}/quests`);
    return { ok: true, data: { message: "Quest created." } };
  } catch (error) {
    return { ok: false, error: toActionError(error) };
  }
}

export async function updateQuestAction(
  _state: LecturerActionState,
  formData: FormData
): Promise<LecturerActionState> {
  const parsed = updateQuestSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) return validationError(parsed.error);

  try {
    const user = await requireRole("LECTURER");
    await updateQuest({ ...parsed.data, lecturerId: user.id });
    revalidatePath(`/lecturer/classes/${parsed.data.classId}/quests`);
    return { ok: true, data: { message: "Quest updated." } };
  } catch (error) {
    return { ok: false, error: toActionError(error) };
  }
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

export async function connectQuestActivityAction(
  _state: LecturerActionState,
  formData: FormData
): Promise<LecturerActionState> {
  const parsed = connectQuestActivitySchema.safeParse(formDataToObject(formData));
  if (!parsed.success) return validationError(parsed.error);

  try {
    const user = await requireRole("LECTURER");
    await connectActivityToQuest({ ...parsed.data, lecturerId: user.id });
    revalidatePath("/lecturer/classes");
    return { ok: true, data: { message: "Mission connected to quest." } };
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

  try {
    const user = await requireRole("LECTURER");
    await gradeSubmission({ ...parsed.data, lecturerId: user.id });
    revalidatePath("/lecturer/classes");
    return { ok: true, data: { message: "Submission graded." } };
  } catch (error) {
    return { ok: false, error: toActionError(error) };
  }
}

export async function publishGradeAction(
  _state: LecturerActionState,
  formData: FormData
): Promise<LecturerActionState> {
  const parsed = publishGradeSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) return validationError(parsed.error);

  try {
    const user = await requireRole("LECTURER");
    await publishGrade(parsed.data.gradeId, user.id);
    revalidatePath("/lecturer/classes");
    return { ok: true, data: { message: "Grade published." } };
  } catch (error) {
    return { ok: false, error: toActionError(error) };
  }
}
