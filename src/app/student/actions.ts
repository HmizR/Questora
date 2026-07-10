"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import type { StudentActionState } from "@/app/student/action-state";
import { requireRole } from "@/lib/authorization-service";
import { toActionError } from "@/lib/errors";
import { formDataToObject } from "@/lib/form-data";
import {
  activityIdSchema,
  attemptQuizSchema,
  submitAssignmentSchema
} from "@/schemas/student";
import { completeActivity, startActivity } from "@/services/progress-service";
import { attemptQuiz, submitAssignment } from "@/services/student-service";

function validationError(error: z.ZodError): StudentActionState {
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

export async function startActivityAction(
  _state: StudentActionState,
  formData: FormData
): Promise<StudentActionState> {
  const parsed = activityIdSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) return validationError(parsed.error);

  try {
    const user = await requireRole("STUDENT");
    await startActivity(parsed.data.activityId, user.id);
    revalidatePath("/student/classes");
    return { ok: true, data: { message: "Mission started." } };
  } catch (error) {
    return { ok: false, error: toActionError(error) };
  }
}

export async function completeLessonAction(
  _state: StudentActionState,
  formData: FormData
): Promise<StudentActionState> {
  const parsed = activityIdSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) return validationError(parsed.error);

  try {
    const user = await requireRole("STUDENT");
    await completeActivity(parsed.data.activityId, user.id);
    revalidatePath("/student/classes");
    revalidatePath("/student/profile");
    return { ok: true, data: { message: "Mission completed." } };
  } catch (error) {
    return { ok: false, error: toActionError(error) };
  }
}

export async function submitAssignmentAction(
  _state: StudentActionState,
  formData: FormData
): Promise<StudentActionState> {
  const parsed = submitAssignmentSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) return validationError(parsed.error);

  try {
    const user = await requireRole("STUDENT");
    await submitAssignment({ ...parsed.data, studentId: user.id });
    revalidatePath("/student/classes");
    return { ok: true, data: { message: "Submission sent." } };
  } catch (error) {
    return { ok: false, error: toActionError(error) };
  }
}

export async function attemptQuizAction(
  _state: StudentActionState,
  formData: FormData
): Promise<StudentActionState> {
  const parsed = attemptQuizSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) return validationError(parsed.error);

  try {
    const user = await requireRole("STUDENT");
    await attemptQuiz({ ...parsed.data, studentId: user.id });
    revalidatePath("/student/classes");
    revalidatePath("/student/profile");
    return { ok: true, data: { message: "Quiz attempt recorded." } };
  } catch (error) {
    return { ok: false, error: toActionError(error) };
  }
}
