import { AnnouncementCard } from "@/components/ui/announcement-card";
import { ClassTabs } from "@/components/ui/class-tabs";
import { DashboardShell } from "@/components/ui/dashboard-shell";
import { EmptyState } from "@/components/ui/empty-state";
import { requireClassEnrollment } from "@/lib/authorization-service";
import { db } from "@/lib/db";
import { getPublishedAnnouncementsForStudent } from "@/services/announcement-service";

export default async function StudentAnnouncementsPage({
  params
}: {
  params: Promise<{ classId: string }>;
}) {
  const { classId } = await params;
  const { user } = await requireClassEnrollment(classId);

  const [teachingClass, announcements] = await Promise.all([
    db.class.findUnique({ where: { id: classId }, select: { name: true } }),
    getPublishedAnnouncementsForStudent({ studentId: user.id, classId })
  ]);

  return (
    <DashboardShell
      title="Announcements"
      subtitle={`Latest updates from ${teachingClass?.name ?? "this realm"}.`}
    >
      <ClassTabs classId={classId} role="STUDENT" />
      {announcements.length === 0 ? (
        <EmptyState
          description="Published realm updates from your lecturer will appear here."
          title="No announcements yet"
        />
      ) : (
        <div className="space-y-4">
          {announcements.map((announcement) => (
            <AnnouncementCard
              authorName={announcement.createdBy.name}
              body={announcement.body}
              createdAt={announcement.createdAt}
              key={announcement.id}
              publishedAt={announcement.publishedAt}
              title={announcement.title}
            />
          ))}
        </div>
      )}
    </DashboardShell>
  );
}
