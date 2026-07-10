"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import type { AdminActionState } from "@/app/admin/action-state";
import { requireAdmin } from "@/lib/authorization-service";
import { toActionError } from "@/lib/errors";
import { formDataToObject } from "@/lib/form-data";
import {
  createClassSchema,
  createUserSchema,
  deactivateUserSchema,
  enrollStudentSchema,
  removeStudentSchema,
  updateClassSchema,
  updateUserSchema
} from "@/schemas/admin";
import {
  createClass,
  enrollStudent,
  removeStudent,
  updateClass
} from "@/services/class-service";
import { createUser, deactivateUser, updateUser } from "@/services/user-service";

function validationError(error: z.ZodError): AdminActionState {
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

export async function createUserAction(
  _state: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  const parsed = createUserSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) {
    return validationError(parsed.error);
  }

  let userId = "";
  try {
    await requireAdmin();
    const user = await createUser(parsed.data);
    userId = user.id;
    revalidatePath("/admin/users");
  } catch (error) {
    return { ok: false, error: toActionError(error) };
  }

  redirect(`/admin/users/${userId}`);
}

export async function updateUserAction(
  _state: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  const parsed = updateUserSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) {
    return validationError(parsed.error);
  }

  try {
    await requireAdmin();
    await updateUser(parsed.data);
    revalidatePath("/admin/users");
    revalidatePath(`/admin/users/${parsed.data.userId}`);
    return { ok: true, data: { message: "User updated." } };
  } catch (error) {
    return { ok: false, error: toActionError(error) };
  }
}

export async function deactivateUserAction(
  _state: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  const parsed = deactivateUserSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) {
    return validationError(parsed.error);
  }

  try {
    await requireAdmin();
    await deactivateUser(parsed.data.userId);
    revalidatePath("/admin/users");
    revalidatePath(`/admin/users/${parsed.data.userId}`);
    return { ok: true, data: { message: "User deactivated." } };
  } catch (error) {
    return { ok: false, error: toActionError(error) };
  }
}

export async function createClassAction(
  _state: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  const parsed = createClassSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) {
    return validationError(parsed.error);
  }

  let classId = "";
  try {
    const admin = await requireAdmin();
    const teachingClass = await createClass({ ...parsed.data, createdById: admin.id });
    classId = teachingClass.id;
    revalidatePath("/admin/classes");
  } catch (error) {
    return { ok: false, error: toActionError(error) };
  }

  redirect(`/admin/classes/${classId}`);
}

export async function updateClassAction(
  _state: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  const parsed = updateClassSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) {
    return validationError(parsed.error);
  }

  try {
    await requireAdmin();
    await updateClass(parsed.data);
    revalidatePath("/admin/classes");
    revalidatePath(`/admin/classes/${parsed.data.classId}`);
    return { ok: true, data: { message: "Class updated." } };
  } catch (error) {
    return { ok: false, error: toActionError(error) };
  }
}

export async function enrollStudentAction(
  _state: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  const parsed = enrollStudentSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) {
    return validationError(parsed.error);
  }

  try {
    await requireAdmin();
    await enrollStudent(parsed.data.classId, parsed.data.studentId);
    revalidatePath(`/admin/classes/${parsed.data.classId}`);
    return { ok: true, data: { message: "Student enrolled." } };
  } catch (error) {
    return { ok: false, error: toActionError(error) };
  }
}

export async function removeStudentAction(
  _state: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  const parsed = removeStudentSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) {
    return validationError(parsed.error);
  }

  try {
    await requireAdmin();
    await removeStudent(parsed.data.classId, parsed.data.studentId);
    revalidatePath(`/admin/classes/${parsed.data.classId}`);
    return { ok: true, data: { message: "Student removed from active enrollment." } };
  } catch (error) {
    return { ok: false, error: toActionError(error) };
  }
}
