import type { ActionResult } from "@/lib/errors";

export type LecturerActionState = ActionResult<{ message: string }>;

export const initialLecturerActionState: LecturerActionState = {
  ok: true,
  data: { message: "" }
};
