import Link from "next/link";
import { notFound } from "next/navigation";

import { AnnouncementCard } from "@/components/ui/announcement-card";
import { ClassTabs } from "@/components/ui/class-tabs";
import { DashboardShell } from "@/components/ui/dashboard-shell";
import { EmptyState } from "@/components/ui/empty-state";
import {
  ArchiveAnnouncementForm,
  DeleteAnnouncementForm,
  PublishAnnouncementForm
} from "@/components/lecturer/forms";
import { requireClassLecturer } from "@/lib/authorization-service";
import { db } from "@/lib/db";

export default async function LecturerAnnouncementsPage({
  params
}: {
  params: Promise<{ classId: string }>;
}) {
  const { classId } = await params;
  await requireClassLecturer(classId);

  const [teachingClass, announcements] = await Promise.all([
    db.class.findUnique({ where: { id: classId }, select: { name: true } }),
    db.announcement.findMany({
      where: { classId },
      include: { createdBy: { select: { name: true } } },
      orderBy: [{ updatedAt: "desc" }]
    })
  ]);

  if (!teachingClass) notFound();

  return (
    <DashboardShell
      title={`${teachingClass.name} announcements`}
      subtitle="Post realm updates for enrolled students."
    >
      <ClassTabs classId={classId} role="LECTURER" />
      <div className="mb-5 flex justify-end">
        <Link
          className="rounded-md bg-ink px-4 py-2 text-sm font-semibold text-white hover:bg-steel"
          href={`/lecturer/classes/${classId}/announcements/new`}
        >
          New announcement
        </Link>
      </div>
      {announcements.length === 0 ? (
        <EmptyState
          actionHref={`/lecturer/classes/${classId}/announcements/new`}
          actionLabel="New announcement"
          description="Create a short class update, keep it as a draft, then publish it when students should see it."
          title="No announcements yet"
        />
      ) : (
        <div className="space-y-4">
          {announcements.map((announcement) => (
            <AnnouncementCard
              actions={
                <>
                  <Link
                    className="rounded-md border border-border/80 bg-surface px-3 py-1.5 text-xs font-semibold hover:bg-surface-muted"
                    href={`/lecturer/classes/${classId}/announcements/${announcement.id}/edit`}
                  >
                    Edit
                  </Link>
                  {announcement.status !== "PUBLISHED" ? (
                    <PublishAnnouncementForm announcementId={announcement.id} classId={classId} />
                  ) : null}
                  {announcement.status !== "ARCHIVED" ? (
                    <ArchiveAnnouncementForm announcementId={announcement.id} classId={classId} />
                  ) : null}
                  <DeleteAnnouncementForm announcementId={announcement.id} classId={classId} />
                </>
              }
              authorName={announcement.createdBy.name}
              body={announcement.body}
              createdAt={announcement.createdAt}
              key={announcement.id}
              publishedAt={announcement.publishedAt}
              status={announcement.status}
              title={announcement.title}
            />
          ))}
        </div>
      )}
    </DashboardShell>
  );
}
