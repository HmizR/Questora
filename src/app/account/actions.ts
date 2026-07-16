"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import type { AccountActionState } from "@/app/account/action-state";
import { requireUser } from "@/lib/authorization-service";
import { toActionError } from "@/lib/errors";
import { formDataToObject } from "@/lib/form-data";
import { changeOwnPasswordSchema, updateOwnProfileSchema } from "@/schemas/account";
import { changeOwnPassword, updateOwnProfile } from "@/services/account-service";

function validationError(error: z.ZodError): AccountActionState {
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

export async function updateOwnProfileAction(
  _state: AccountActionState,
  formData: FormData
): Promise<AccountActionState> {
  const parsed = updateOwnProfileSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) {
    return validationError(parsed.error);
  }

  try {
    const user = await requireUser();
    await updateOwnProfile({ userId: user.id, ...parsed.data });
    revalidatePath("/account");
    return { ok: true, data: { message: "Profile updated." } };
  } catch (error) {
    return { ok: false, error: toActionError(error) };
  }
}

export async function changeOwnPasswordAction(
  _state: AccountActionState,
  formData: FormData
): Promise<AccountActionState> {
  const parsed = changeOwnPasswordSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) {
    return validationError(parsed.error);
  }

  try {
    const user = await requireUser();
    await changeOwnPassword({
      userId: user.id,
      currentPassword: parsed.data.currentPassword,
      newPassword: parsed.data.newPassword
    });
    return { ok: true, data: { message: "Password changed." } };
  } catch (error) {
    return { ok: false, error: toActionError(error) };
  }
}
