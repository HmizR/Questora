import type { ActionResult } from "@/lib/errors";

export type AccountActionState = ActionResult<{ message: string }>;

export const initialAccountActionState: AccountActionState = {
  ok: true,
  data: { message: "" }
};
