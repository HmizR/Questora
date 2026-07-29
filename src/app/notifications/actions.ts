"use server";

import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/authorization-service";
import { toActionError } from "@/lib/errors";
import {
  markAllNotificationsRead,
  markNotificationRead
} from "@/services/notification-service";

export async function markNotificationReadAction(notificationId: string) {
  try {
    const user = await requireUser();
    await markNotificationRead({ userId: user.id, notificationId });
    revalidatePath("/notifications");
    return { ok: true as const };
  } catch (error) {
    return { ok: false as const, error: toActionError(error) };
  }
}

export async function markAllNotificationsReadAction() {
  try {
    const user = await requireUser();
    await markAllNotificationsRead(user.id);
    revalidatePath("/notifications");
    return { ok: true as const };
  } catch (error) {
    return { ok: false as const, error: toActionError(error) };
  }
}
