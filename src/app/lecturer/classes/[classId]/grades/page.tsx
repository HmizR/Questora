import { ActivityType } from "@prisma/client";
import { notFound } from "next/navigation";

import { ClassTabs } from "@/components/ui/class-tabs";
import { DashboardShell } from "@/components/ui/dashboard-shell";
import { EmptyState } from "@/components/ui/empty-state";
import { AnalyticsControls, SortHeader } from "@/components/ui/analytics-controls";
import { StatusBadge } from "@/components/ui/status-badge";
import { requireClassLecturer } from "@/lib/authorization-service";
import { formatTimestampLabel } from "@/lib/date-format";
import { db } from "@/lib/db";
import {
  matchesSearch,
  missionNeedsAttention,
  parseAnalyticsQuery,
  queryHref,
  sortByDirection
} from "@/lib/lecturer-analytics";

const gradeSorts = ["name", "published", "draft", "ungraded", "not-submitted"] as const;
const gradeStatuses = ["published", "draft", "ungraded", "not-submitted", "no-grade"] as const;
const missionTypes = ["all", ActivityType.ASSIGNMENT, ActivityType.PROJECT, ActivityType.QUIZ] as const;
type GradeSort = (typeof gradeSorts)[number];
type GradeStatus = (typeof gradeStatuses)[number];

export default async function LecturerGradesPage({
  params,
  searchParams
}: {
  params: Promise<{ classId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { classId } = await params;
  const rawSearchParams = await searchParams;
  const query = parseAnalyticsQuery<GradeSort, GradeStatus>(rawSearchParams, {
    defaultSort: "name",
    allowedSorts: gradeSorts,
    allowedStatuses: gradeStatuses
  });
  const rawType = rawSearchParams.type;
  const typeFilter = missionTypes.includes(
    (Array.isArray(rawType) ? rawType[0] : rawType) as (typeof missionTypes)[number]
  )
    ? ((Array.isArray(rawType) ? rawType[0] : rawType) as (typeof missionTypes)[number])
    : "all";
  await requireClassLecturer(classId);

  const teachingClass = await db.class.findUnique({
    where: { id: classId },
    include: {
      students: {
        where: { status: "ACTIVE" },
        include: { student: true },
        orderBy: [{ student: { name: "asc" } }, { enrolledAt: "asc" }]
      },
      modules: {
        include: {
          activities: {
            where: { type: { not: ActivityType.LESSON } },
            include: {
              grades: true,
              submissions: true
            },
            orderBy: { position: "asc" }
          }
        },
        orderBy: { position: "asc" }
      }
    }
  });

  if (!teachingClass) notFound();

  const missions = teachingClass.modules.flatMap((learningModule) =>
    learningModule.activities.map((activity) => ({
      ...activity,
      moduleTitle: learningModule.title
    }))
  ).filter((mission) => typeFilter === "all" || mission.type === typeFilter);
  const pathname = `/lecturer/classes/${classId}/grades`;
  const queryRecord = {
    q: query.q,
    status: query.status,
    attention: query.attention,
    sort: query.sort,
    dir: query.dir,
    type: typeFilter
  };
  const gradeStateFor = (mission: (typeof missions)[number], studentId: string) => {
    const grade = mission.grades.find((entry) => entry.studentId === studentId);
    const submission = mission.submissions.find((entry) => entry.studentId === studentId);
    if (grade?.publishedAt) return "published";
    if (grade) return "draft";
    if (submission) return "ungraded";
    if (mission.type === ActivityType.ASSIGNMENT || mission.type === ActivityType.PROJECT) {
      return "not-submitted";
    }
    return "no-grade";
  };
  const rowMetrics = teachingClass.students.map((enrollment) => {
    const counts = {
      published: 0,
      draft: 0,
      ungraded: 0,
      "not-submitted": 0,
      "no-grade": 0,
      attention: 0
    };

    for (const mission of missions) {
      const state = gradeStateFor(mission, enrollment.studentId);
      counts[state] += 1;
      const grade = mission.grades.find((entry) => entry.studentId === enrollment.studentId);
      const submission = mission.submissions.find((entry) => entry.studentId === enrollment.studentId);
      if (
        missionNeedsAttention({
          type: mission.type,
          dueAt: mission.dueAt,
          hasSubmission: Boolean(submission),
          hasGrade: Boolean(grade),
          gradePublishedAt: grade?.publishedAt
        })
      ) {
        counts.attention += 1;
      }
    }

    return { enrollment, counts };
  });
  const filteredRows = rowMetrics.filter(({ enrollment, counts }) => {
    if (!matchesSearch(enrollment.student, query.q)) return false;
    if (query.status !== "all" && counts[query.status] === 0) return false;
    if (query.attention === "needs-attention" && counts.attention === 0) return false;
    return true;
  });
  const sortedRows = sortByDirection(filteredRows, query.dir, (row) => {
    if (query.sort === "name") return row.enrollment.student.name;
    return row.counts[query.sort];
  });

  return (
    <DashboardShell title="Grades" subtitle="Review grade coverage across students and missions.">
      <ClassTabs classId={classId} role="LECTURER" />
      <AnalyticsControls
        action={pathname}
        exportHref={queryHref(`/api/lecturer/classes/${classId}/grades/export`, queryRecord, {})}
        query={query}
        sortOptions={[
          { label: "Name", value: "name" },
          { label: "Published count", value: "published" },
          { label: "Draft count", value: "draft" },
          { label: "Ungraded count", value: "ungraded" },
          { label: "Not submitted count", value: "not-submitted" }
        ]}
        statusOptions={[
          { label: "Published", value: "published" },
          { label: "Draft grade", value: "draft" },
          { label: "Ungraded", value: "ungraded" },
          { label: "Not submitted", value: "not-submitted" },
          { label: "No grade", value: "no-grade" }
        ]}
      >
        <label className="grid gap-1 text-sm font-semibold">
          <span className="text-xs uppercase tracking-wide text-ink/55">Mission type</span>
          <select
            className="min-h-10 rounded-md border border-border bg-surface px-3 text-sm outline-none focus:border-moss"
            defaultValue={typeFilter}
            name="type"
          >
            <option value="all">All</option>
            <option value={ActivityType.ASSIGNMENT}>Assignments</option>
            <option value={ActivityType.PROJECT}>Projects</option>
            <option value={ActivityType.QUIZ}>Quizzes</option>
          </select>
        </label>
      </AnalyticsControls>
      {teachingClass.students.length === 0 ? (
        <EmptyState
          description="Enroll students before grade coverage can appear."
          title="No active students enrolled"
        />
      ) : missions.length === 0 ? (
        <EmptyState
          actionHref={`/lecturer/classes/${classId}/modules`}
          actionLabel="Open regions"
          description="Assignments, projects, and quizzes will appear here after you add them."
          title="No gradable missions yet"
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-ink/10 bg-white shadow-sm">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="bg-ink text-white">
            <tr>
              <th className="sticky left-0 z-10 bg-ink px-4 py-3 font-semibold">
                <SortHeader pathname={pathname} query={query} sort="name">Student</SortHeader>
              </th>
              {missions.map((mission) => (
                <th className="min-w-44 px-4 py-3 font-semibold" key={mission.id}>
                  <span className="block">{mission.title}</span>
                  <span className="mt-1 block text-xs font-medium text-white/70">
                    {mission.moduleTitle} - {mission.type}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-ink/10">
            {sortedRows.map(({ enrollment }) => (
                <tr key={enrollment.studentId}>
                  <th className="sticky left-0 bg-white px-4 py-3 font-semibold">
                    <span className="block">{enrollment.student.name}</span>
                    <span className="mt-1 block text-xs font-medium text-ink/55">
                      {enrollment.student.email}
                    </span>
                  </th>
                  {missions.map((mission) => {
                    const grade = mission.grades.find(
                      (entry) => entry.studentId === enrollment.studentId
                    );
                    const submission = mission.submissions.find(
                      (entry) => entry.studentId === enrollment.studentId
                    );

                    return (
                      <td className="px-4 py-3" key={mission.id}>
                        {missionNeedsAttention({
                          type: mission.type,
                          dueAt: mission.dueAt,
                          hasSubmission: Boolean(submission),
                          hasGrade: Boolean(grade),
                          gradePublishedAt: grade?.publishedAt
                        }) ? (
                          <StatusBadge tone="warning">Needs attention</StatusBadge>
                        ) : null}
                        {grade ? (
                          <div
                            className="space-y-1"
                            title={
                              grade.publishedAt
                                ? formatTimestampLabel("Published", grade.publishedAt)
                                : grade.gradedAt
                                  ? formatTimestampLabel("Graded", grade.gradedAt)
                                  : undefined
                            }
                          >
                            <span className="block font-semibold text-ink">
                              {grade.score.toString()}
                            </span>
                            <StatusBadge tone={grade.publishedAt ? "success" : "info"}>
                              {grade.publishedAt ? "Published" : "Draft grade"}
                            </StatusBadge>
                            <span className="block text-xs text-ink/55">
                              {grade.publishedAt
                                ? formatTimestampLabel("Published", grade.publishedAt)
                                : grade.gradedAt
                                  ? formatTimestampLabel("Graded", grade.gradedAt)
                                  : "Graded"}
                            </span>
                          </div>
                        ) : submission ? (
                          <div className="space-y-1">
                            <StatusBadge tone="warning">Ungraded</StatusBadge>
                            {submission.submittedAt ? (
                              <span className="block text-xs text-ink/55">
                                {formatTimestampLabel("Submitted", submission.submittedAt)}
                              </span>
                            ) : null}
                          </div>
                        ) : mission.type === ActivityType.ASSIGNMENT ||
                          mission.type === ActivityType.PROJECT ? (
                          <StatusBadge>Not submitted</StatusBadge>
                        ) : (
                          <StatusBadge>No grade</StatusBadge>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
          </tbody>
        </table>
      </div>
      )}
    </DashboardShell>
  );
}
