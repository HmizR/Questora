import type { ActionResult } from "@/lib/errors";

export type StudentActionState = ActionResult<{ message: string }>;

export const initialStudentActionState: StudentActionState = {
  ok: true,
  data: { message: "" }
};
