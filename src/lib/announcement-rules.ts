import { AnnouncementStatus } from "@prisma/client";

export function isAnnouncementVisibleToStudent(status: AnnouncementStatus) {
  return status === AnnouncementStatus.PUBLISHED;
}

export function nextAnnouncementPublishedAt(input: {
  status: AnnouncementStatus;
  previousPublishedAt?: Date | null;
  now?: Date;
}) {
  if (input.status !== AnnouncementStatus.PUBLISHED) {
    return input.previousPublishedAt ?? null;
  }

  return input.previousPublishedAt ?? input.now ?? new Date();
}
