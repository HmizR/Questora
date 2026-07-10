import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";

export async function assertLecturerOwnsActivity(activityId: string, lecturerId: string) {
  const activity = await db.activity.findUnique({
    where: { id: activityId },
    include: {
      module: {
        include: {
          class: true
        }
      }
    }
  });

  if (!activity) {
    throw new AppError("NOT_FOUND", "Activity not found.");
  }

  if (activity.module.class.lecturerId !== lecturerId) {
    throw new AppError("FORBIDDEN", "You can only manage missions in your own classes.");
  }

  return activity;
}
