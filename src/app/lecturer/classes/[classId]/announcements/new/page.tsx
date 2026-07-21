import Link from "next/link";

import { CreateAnnouncementForm } from "@/components/lecturer/forms";
import { ClassTabs } from "@/components/ui/class-tabs";
import { DashboardShell } from "@/components/ui/dashboard-shell";
import { requireClassLecturer } from "@/lib/authorization-service";

export default async function NewAnnouncementPage({
  params
}: {
  params: Promise<{ classId: string }>;
}) {
  const { classId } = await params;
  await requireClassLecturer(classId);

  return (
    <DashboardShell title="New announcement" subtitle="Draft or publish a realm update for students.">
      <ClassTabs classId={classId} role="LECTURER" />
      <Link className="mb-4 inline-flex text-sm font-semibold text-moss hover:text-ink" href={`/lecturer/classes/${classId}/announcements`}>
        Back to announcements
      </Link>
      <CreateAnnouncementForm classId={classId} />
    </DashboardShell>
  );
}
