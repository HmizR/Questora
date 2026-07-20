import { notFound } from "next/navigation";

import { ClassTabs } from "@/components/ui/class-tabs";
import { DashboardShell } from "@/components/ui/dashboard-shell";
import { AvatarImage } from "@/components/ui/avatar-image";
import { AnalyticsControls, SortHeader } from "@/components/ui/analytics-controls";
import { StatusBadge } from "@/components/ui/status-badge";
import { requireClassLecturer } from "@/lib/authorization-service";
import { db } from "@/lib/db";
import {
  matchesSearch,
  missionNeedsAttention,
  parseAnalyticsQuery,
  queryHref,
  sortByDirection
} from "@/lib/lecturer-analytics";

const rosterSorts = ["name", "xp", "level", "completed", "progress", "grades"] as const;
type RosterSort = (typeof rosterSorts)[number];

export default async function LecturerStudentsPage({
  params,
  searchParams
}: {
  params: Promise<{ classId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { classId } = await params;
  const rawSearchParams = await searchParams;
  const query = parseAnalyticsQuery<RosterSort>(rawSearchParams, {
    defaultSort: "name",
    allowedSorts: rosterSorts
  });
  await requireClassLecturer(classId);

  const teachingClass = await db.class.findUnique({
    where: { id: classId },
    include: {
      modules: {
        include: {
          activities: {
            where: { isPublished: true },
            include: {
              submissions: true,
              grades: true,
              quizAttempts: true
            }
          }
        }
      },
      students: {
        where: { status: "ACTIVE" },
        include: {
          student: {
            include: {
              profile: true,
              progresses: {
                where: { activity: { module: { classId } } }
              },
              grades: {
                where: { activity: { module: { classId } } }
              }
            }
          }
        },
        orderBy: { enrolledAt: "asc" }
      }
    }
  });

  if (!teachingClass) notFound();

  const totalActivities = teachingClass.modules.reduce(
    (count, module) => count + module.activities.length,
    0
  );
  const pathname = `/lecturer/classes/${classId}/students`;
  const queryRecord = {
    q: query.q,
    status: query.status,
    attention: query.attention,
    sort: query.sort,
    dir: query.dir
  };
  const activities = teachingClass.modules.flatMap((module) => module.activities);
  const rows = teachingClass.students.map((entry) => {
    const completed = entry.student.progresses.filter(
      (progress) => progress.status === "COMPLETED"
    ).length;
    const percent = totalActivities > 0 ? Math.round((completed / totalActivities) * 100) : 0;
    const attentionCount = activities.filter((activity) => {
      const submission = activity.submissions.find(
        (item) => item.studentId === entry.studentId
      );
      const grade = activity.grades.find((item) => item.studentId === entry.studentId);
      const attempts = activity.quizAttempts.filter((item) => item.studentId === entry.studentId);
      return missionNeedsAttention({
        type: activity.type,
        dueAt: activity.dueAt,
        hasSubmission: Boolean(submission),
        hasGrade: Boolean(grade),
        gradePublishedAt: grade?.publishedAt,
        attemptsUsed: attempts.length,
        maxAttempts: activity.maxAttempts,
        hasPassed: attempts.some((attempt) => attempt.passed)
      });
    }).length;

    return {
      entry,
      completed,
      percent,
      attentionCount,
      xp: entry.student.profile?.totalXp ?? 0,
      level: entry.student.profile?.level ?? 1,
      grades: entry.student.grades.length
    };
  });
  const filteredRows = rows.filter((row) => {
    if (!matchesSearch(row.entry.student, query.q)) return false;
    if (query.attention === "needs-attention" && row.attentionCount === 0) return false;
    return true;
  });
  const sortedRows = sortByDirection(filteredRows, query.dir, (row) => {
    switch (query.sort) {
      case "xp":
        return row.xp;
      case "level":
        return row.level;
      case "completed":
        return row.completed;
      case "progress":
        return row.percent;
      case "grades":
        return row.grades;
      default:
        return row.entry.student.name;
    }
  });

  return (
    <DashboardShell title="Student roster" subtitle="View learner XP, progress, and grading status.">
      <ClassTabs classId={classId} role="LECTURER" />
      <AnalyticsControls
        action={pathname}
        exportHref={queryHref(`/api/lecturer/classes/${classId}/students/export`, queryRecord, {})}
        query={query}
        sortOptions={[
          { label: "Name", value: "name" },
          { label: "XP", value: "xp" },
          { label: "Level", value: "level" },
          { label: "Completed missions", value: "completed" },
          { label: "Progress", value: "progress" },
          { label: "Grades", value: "grades" }
        ]}
      />
      <div className="overflow-hidden rounded-lg border border-ink/10 bg-white shadow-sm">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="bg-ink text-white">
            <tr>
              <th className="px-4 py-3 font-semibold">
                <SortHeader pathname={pathname} query={query} sort="name">Student</SortHeader>
              </th>
              <th className="px-4 py-3 font-semibold">
                <SortHeader pathname={pathname} query={query} sort="xp">XP</SortHeader>
              </th>
              <th className="px-4 py-3 font-semibold">
                <SortHeader pathname={pathname} query={query} sort="level">Level</SortHeader>
              </th>
              <th className="px-4 py-3 font-semibold">
                <SortHeader pathname={pathname} query={query} sort="completed">Completed missions</SortHeader>
              </th>
              <th className="px-4 py-3 font-semibold">
                <SortHeader pathname={pathname} query={query} sort="progress">Progress</SortHeader>
              </th>
              <th className="px-4 py-3 font-semibold">
                <SortHeader pathname={pathname} query={query} sort="grades">Grades</SortHeader>
              </th>
              <th className="px-4 py-3 font-semibold">Attention</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink/10">
            {sortedRows.map(({ entry, completed, percent, attentionCount, xp, level, grades }) => {
              return (
                <tr key={entry.studentId}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <AvatarImage
                        avatarUrl={entry.student.avatarUrl}
                        name={entry.student.name}
                        size="sm"
                      />
                      <div className="min-w-0">
                        <p className="font-semibold">{entry.student.name}</p>
                        <p className="truncate text-xs text-ink/60">{entry.student.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">{xp}</td>
                  <td className="px-4 py-3">{level}</td>
                  <td className="px-4 py-3">
                    {completed}/{totalActivities}
                  </td>
                  <td className="px-4 py-3">{percent}%</td>
                  <td className="px-4 py-3">{grades}</td>
                  <td className="px-4 py-3">
                    {attentionCount > 0 ? (
                      <StatusBadge tone="warning">Needs attention</StatusBadge>
                    ) : (
                      <StatusBadge>Clear</StatusBadge>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </DashboardShell>
  );
}
