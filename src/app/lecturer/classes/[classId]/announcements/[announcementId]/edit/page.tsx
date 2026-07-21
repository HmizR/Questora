import Link from "next/link";
import { notFound } from "next/navigation";

import { UpdateAnnouncementForm } from "@/components/lecturer/forms";
import { ClassTabs } from "@/components/ui/class-tabs";
import { DashboardShell } from "@/components/ui/dashboard-shell";
import { requireClassLecturer } from "@/lib/authorization-service";
import { db } from "@/lib/db";

export default async function EditAnnouncementPage({
  params
}: {
  params: Promise<{ classId: string; announcementId: string }>;
}) {
  const { classId, announcementId } = await params;
  await requireClassLecturer(classId);

  const announcement = await db.announcement.findUnique({ where: { id: announcementId } });
  if (!announcement || announcement.classId !== classId) {
    notFound();
  }

  return (
    <DashboardShell title="Edit announcement" subtitle="Update the message or change its visibility.">
      <ClassTabs classId={classId} role="LECTURER" />
      <Link className="mb-4 inline-flex text-sm font-semibold text-moss hover:text-ink" href={`/lecturer/classes/${classId}/announcements`}>
        Back to announcements
      </Link>
      <UpdateAnnouncementForm announcement={announcement} />
    </DashboardShell>
  );
}
