import type { ActionResult } from "@/lib/errors";

export type AdminActionState = ActionResult<{ message: string }>;

export const initialAdminActionState: AdminActionState = {
  ok: true,
  data: { message: "" }
};
