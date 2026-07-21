import { ActivityType } from "@prisma/client";

import { requireClassEnrollment, requireUser } from "@/lib/authorization-service";
import { formatDateTime } from "@/lib/date-format";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import type { AIContextInput } from "@/schemas/ai";
import type { AIContextResult, AISource } from "@/services/ai/ai-types";
import { academicHonestyPrompt } from "@/services/ai/ai-prompts";
import { getPublishedAnnouncementsForStudent } from "@/services/announcement-service";
import { getStudentDeadlineItems } from "@/services/deadline-service";
import { assertStudentCanAccessActivity } from "@/services/progress-service";

function compact(value: string | null | undefined) {
  return value?.trim() || "None";
}

function dateOrNone(value: Date | null | undefined) {
  return value ? formatDateTime(value) : "No due date";
}

function createContextResult(params: {
  label: string;
  contextText: string;
  sources: AISource[];
}): AIContextResult {
  return {
    label: params.label,
    systemPrompt: academicHonestyPrompt,
    contextText: params.contextText,
    sources: params.sources
  };
}

export async function buildAIContext(input: AIContextInput): Promise<AIContextResult> {
  if (input.type === "STUDENT_ACTIVITY") {
    return buildStudentActivityContext(input.classId, input.activityId);
  }

  if (input.type === "STUDENT_CLASS") {
    return buildStudentClassContext(input.classId);
  }

  await requireUser();
  return createContextResult({
    label: "General help",
    contextText:
      "The user is on a protected Questora page without page-specific learning context. Help with general navigation, study habits, and how to use Questora. Do not claim access to page data.",
    sources: [{ label: "Questora", detail: "General protected app context" }]
  });
}

async function buildStudentActivityContext(classId: string, activityId: string) {
  const { user } = await requireClassEnrollment(classId);
  const activity = await assertStudentCanAccessActivity(activityId, user.id);

  if (activity.module.classId !== classId) {
    throw new AppError("FORBIDDEN", "This mission does not belong to the selected class.");
  }

  const [progress, resources, questLinks, announcements] = await Promise.all([
    db.activityProgress.findUnique({
      where: { activityId_studentId: { activityId, studentId: user.id } }
    }),
    db.activityResource.findMany({
      where: { activityId },
      orderBy: [{ isRequired: "desc" }, { position: "asc" }]
    }),
    db.questActivity.findMany({
      where: { activityId, quest: { classId, isPublished: true } },
      include: { quest: true },
      orderBy: { position: "asc" }
    }),
    getPublishedAnnouncementsForStudent({ studentId: user.id, classId, take: 5 })
  ]);

  const resourceText =
    resources.length === 0
      ? "No uploaded resource metadata is available."
      : resources
          .map(
            (resource) =>
              `- ${resource.title} (${resource.kind}, ${resource.isRequired ? "required" : "optional"}): ${compact(
                resource.description
              )}. File: ${resource.fileName}.`
          )
          .join("\n");
  const questText =
    questLinks.length === 0
      ? "No published connected quests."
      : questLinks
          .map((link) => `- ${link.quest.title} (${link.quest.type}): ${compact(link.quest.description)}`)
          .join("\n");
  const announcementText =
    announcements.length === 0
      ? "No recent published announcements."
      : announcements
          .map((announcement) => `- ${announcement.title}: ${announcement.body}`)
          .join("\n");

  const sources: AISource[] = [
    { label: "Mission", detail: activity.title },
    { label: "Region", detail: activity.module.title },
    { label: "Realm", detail: activity.module.class.name },
    ...resources.map((resource) => ({ label: "Resource", detail: resource.title })),
    ...questLinks.map((link) => ({ label: "Quest", detail: link.quest.title })),
    ...announcements.map((announcement) => ({ label: "Announcement", detail: announcement.title }))
  ];

  return createContextResult({
    label: "Using current mission",
    sources,
    contextText: `
Student mission context:
Realm: ${activity.module.class.name}
Region: ${activity.module.title}
Mission: ${activity.title}
Type: ${activity.type}
Description: ${compact(activity.description)}
Instructions/content: ${compact(activity.content)}
Due date: ${dateOrNone(activity.dueAt)}
Max score: ${activity.maxScore?.toString() ?? "None"}
Passing score: ${activity.passingScore?.toString() ?? "None"}
Progress status: ${progress?.status ?? "NOT_STARTED"}
Progress percent: ${progress?.progressPercent ?? 0}

Resource metadata only. Full uploaded file contents are not available yet:
${resourceText}

Connected published quests:
${questText}

Recent published announcements:
${announcementText}
`.trim()
  });
}

async function buildStudentClassContext(classId: string) {
  const { user } = await requireClassEnrollment(classId);

  const [teachingClass, deadlines, announcements, quests] = await Promise.all([
    db.class.findUnique({
      where: { id: classId },
      include: {
        modules: {
          where: {
            isPublished: true,
            OR: [{ availableFrom: null }, { availableFrom: { lte: new Date() } }]
          },
          include: {
            activities: {
              where: { isPublished: true },
              orderBy: { position: "asc" },
              select: {
                id: true,
                title: true,
                type: true,
                description: true,
                dueAt: true,
                position: true
              }
            }
          },
          orderBy: { position: "asc" }
        }
      }
    }),
    getStudentDeadlineItems({ studentId: user.id, classId }),
    getPublishedAnnouncementsForStudent({ studentId: user.id, classId, take: 5 }),
    db.quest.findMany({
      where: { classId, isPublished: true },
      orderBy: { position: "asc" },
      select: {
        title: true,
        description: true,
        type: true,
        xpReward: true
      }
    })
  ]);

  if (!teachingClass) {
    throw new AppError("NOT_FOUND", "Class not found.");
  }

  const missionText = teachingClass.modules
    .flatMap((module) =>
      module.activities.map((activity) => {
        const bossLabel = activity.type === ActivityType.PROJECT ? " Boss battle." : "";
        return `- ${module.title} / ${activity.title} (${activity.type}). Due: ${dateOrNone(
          activity.dueAt
        )}.${bossLabel} ${compact(activity.description)}`;
      })
    )
    .join("\n");
  const deadlineText =
    deadlines.length === 0
      ? "No upcoming or overdue deadlines."
      : deadlines
          .slice(0, 8)
          .map((item) => `- ${item.title}: ${item.state}, due ${formatDateTime(item.dueAt)}`)
          .join("\n");
  const questText =
    quests.length === 0
      ? "No published quests."
      : quests
          .map((quest) => `- ${quest.title} (${quest.type}, ${quest.xpReward} XP): ${compact(quest.description)}`)
          .join("\n");
  const announcementText =
    announcements.length === 0
      ? "No recent published announcements."
      : announcements.map((announcement) => `- ${announcement.title}: ${announcement.body}`).join("\n");

  return createContextResult({
    label: "Using current realm",
    sources: [
      { label: "Realm", detail: teachingClass.name },
      ...teachingClass.modules.map((module) => ({ label: "Region", detail: module.title })),
      ...quests.map((quest) => ({ label: "Quest", detail: quest.title })),
      ...announcements.map((announcement) => ({ label: "Announcement", detail: announcement.title }))
    ],
    contextText: `
Student class context:
Realm: ${teachingClass.name}
Description: ${compact(teachingClass.description)}

Published missions:
${missionText || "No published missions."}

Published quests:
${questText}

Deadlines:
${deadlineText}

Recent published announcements:
${announcementText}
`.trim()
  });
}
