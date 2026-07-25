import { ActivityType, ProgressStatus } from "@prisma/client";
import { BookOpen, ClipboardCheck, FolderKanban, HelpCircle } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { readableStatus } from "@/lib/status-label";
import { cn } from "@/lib/utils";
import { StatusBadge, type StatusBadgeTone } from "@/components/ui/status-badge";

const activityTypeIcons: Record<ActivityType, LucideIcon> = {
  LESSON: BookOpen,
  ASSIGNMENT: ClipboardCheck,
  QUIZ: HelpCircle,
  PROJECT: FolderKanban
};

const activityTypeLabels: Record<ActivityType, string> = {
  LESSON: "Lesson",
  ASSIGNMENT: "Assignment",
  QUIZ: "Quiz",
  PROJECT: "Project"
};

const progressTone: Record<ProgressStatus, StatusBadgeTone> = {
  NOT_STARTED: "neutral",
  IN_PROGRESS: "info",
  SUBMITTED: "warning",
  COMPLETED: "success",
  FAILED: "danger"
};

export function activityTypeLabel(type: ActivityType) {
  return activityTypeLabels[type];
}

export function MissionTypeIcon({
  className,
  type
}: {
  className?: string;
  type: ActivityType;
}) {
  const Icon = activityTypeIcons[type];

  return (
    <span
      className={cn(
        "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border/80 bg-surface-muted text-accent",
        className
      )}
      title={activityTypeLabels[type]}
    >
      <Icon aria-hidden className="h-4 w-4" />
      <span className="sr-only">{activityTypeLabels[type]}</span>
    </span>
  );
}

export function ProgressStatusBadge({
  status = ProgressStatus.NOT_STARTED
}: {
  status?: ProgressStatus | null;
}) {
  const normalizedStatus = status ?? ProgressStatus.NOT_STARTED;

  return (
    <StatusBadge tone={progressTone[normalizedStatus]}>
      {readableStatus(normalizedStatus)}
    </StatusBadge>
  );
}
