type Role = "ADMIN" | "LECTURER" | "STUDENT";
type ProgressStatus = "NOT_STARTED" | "IN_PROGRESS" | "SUBMITTED" | "COMPLETED" | "FAILED";
type QuestType = "MAIN" | "SIDE" | "CHALLENGE" | "BOSS";

type SessionLike = {
  id: string;
  role: Role;
};

export function canLecturerManageClass(session: SessionLike, classLecturerId: string) {
  return session.role === "LECTURER" && session.id === classLecturerId;
}

export function canStudentAccessClass(
  session: SessionLike,
  enrollment?: { studentId: string; status: "ACTIVE" | "COMPLETED" | "DROPPED" } | null
) {
  return (
    session.role === "STUDENT" &&
    Boolean(enrollment) &&
    enrollment?.studentId === session.id &&
    enrollment.status === "ACTIVE"
  );
}

export function canStudentAccessPublishedActivity(input: {
  session: SessionLike;
  enrollment?: { studentId: string; status: "ACTIVE" | "COMPLETED" | "DROPPED" } | null;
  modulePublished: boolean;
  activityPublished: boolean;
  availableFrom?: Date | null;
  now: Date;
  prerequisitesSatisfied: boolean;
}) {
  return (
    canStudentAccessClass(input.session, input.enrollment) &&
    input.modulePublished &&
    input.activityPublished &&
    (!input.availableFrom || input.availableFrom <= input.now) &&
    input.prerequisitesSatisfied
  );
}

export function canStudentViewGrade(input: {
  session: SessionLike;
  gradeStudentId: string;
  publishedAt?: Date | null;
}) {
  return (
    input.session.role === "STUDENT" &&
    input.session.id === input.gradeStudentId &&
    Boolean(input.publishedAt)
  );
}

export function canAdminEnrollStudent(input: {
  session: SessionLike;
  targetRole: Role;
  classExists: boolean;
}) {
  return input.session.role === "ADMIN" && input.targetRole === "STUDENT" && input.classExists;
}

export function deriveQuestCompletion(
  activities: Array<{ isRequired: boolean; status: ProgressStatus }>
) {
  const required = activities.filter((activity) => activity.isRequired);
  return required.length > 0 && required.every((activity) => activity.status === "COMPLETED");
}

export function shouldAwardQuestXp(input: { questComplete: boolean; existingTransaction: boolean }) {
  return input.questComplete && !input.existingTransaction;
}

export function shouldAwardBossSlayer(input: { questType: QuestType; xpWasNewlyAwarded: boolean }) {
  return input.questType === "BOSS" && input.xpWasNewlyAwarded;
}

export function gradeAndXpRemainSeparate(input: { gradeScore?: number; xpAmount?: number }) {
  return typeof input.gradeScore === "number" && input.xpAmount === undefined;
}
