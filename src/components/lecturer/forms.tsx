import {
  ActivityResourceEmbeddingStatus,
  ActivityType,
  ActivityResourceKind,
  AnnouncementStatus,
  QuestType,
  type Announcement,
  type Activity,
  type ActivityResource,
  type Module,
  type Quest
} from "@prisma/client";

import {
  addActivityPrerequisiteAction,
  archiveAnnouncementAction,
  clearActivityResourceEmbeddingsAction,
  clearActivityResourceExtractionAction,
  connectQuestActivityAction,
  createAnnouncementAction,
  createActivityAction,
  createActivityResourceAction,
  createModuleAction,
  createQuestAction,
  deleteAnnouncementAction,
  deleteActivityAction,
  deleteActivityResourceAction,
  deleteModuleAction,
  deleteQuestAction,
  gradeSubmissionAction,
  publishActivityAction,
  publishAnnouncementAction,
  publishGradeAction,
  publishModuleAction,
  publishQuestAction,
  removeActivityPrerequisiteAction,
  removeQuestActivityAction,
  retryActivityResourceEmbeddingsAction,
  retryActivityResourceExtractionAction,
  returnSubmissionAction,
  updateActivityAction,
  updateAnnouncementAction,
  updateActivityResourceAction,
  updateModuleAction,
  updateQuestAction
} from "@/app/lecturer/actions";
import { LecturerActionForm } from "@/components/lecturer/action-form";
import { MissionResourceUpload } from "@/components/lecturer/mission-resource-upload";
import { SelectField, TextAreaField, TextField } from "@/components/admin/form-fields";
import { ConfirmAction } from "@/components/ui/confirm-action";
import { activityTypeLabel } from "@/components/ui/mission-display";
import { ResourceFileCard } from "@/components/ui/resource-file-card";
import { QuizBuilderFields } from "@/components/lecturer/quiz-builder-fields";
import { getQuizQuestionFieldDefaults } from "@/lib/quiz";

type ActivityOption = Pick<Activity, "id" | "title" | "position" | "type">;
type PrerequisiteView = {
  requiredActivityId: string;
  minimumScore: { toString(): string } | null;
  requiredActivity: ActivityOption;
};
type ResourceWithEmbeddingSummary = ActivityResource & {
  extractedTexts?: Array<{
    embeddingStatus: ActivityResourceEmbeddingStatus;
    embeddingError: string | null;
  }>;
};

const smallActionButton =
  "rounded-md border bg-white px-3 py-1.5 text-xs font-semibold hover:text-white";

const menuItemButton =
  "block w-full rounded-md px-3 py-2 text-left text-sm font-semibold text-ink/75 hover:bg-parchment hover:text-ink";

const menuDangerButton =
  "block w-full rounded-md px-3 py-2 text-left text-sm font-semibold text-ember hover:bg-ember/10";

function boolDefault(value: boolean) {
  return value ? "on" : undefined;
}

function dateInput(value?: Date | null) {
  return value ? value.toISOString().slice(0, 10) : "";
}

function activityOptions(activities: ActivityOption[]) {
  return activities.map((activity) => ({
    value: activity.id,
    label: `${activity.position}. ${activity.title} (${activityTypeLabel(activity.type)})`
  }));
}

function resourceKindOptions() {
  return [
    { value: ActivityResourceKind.READING, label: "Reading" },
    { value: ActivityResourceKind.SLIDES, label: "Slides" },
    { value: ActivityResourceKind.WORKSHEET, label: "Worksheet" },
    { value: ActivityResourceKind.REFERENCE, label: "Reference" },
    { value: ActivityResourceKind.STARTER_FILE, label: "Starter file" },
    { value: ActivityResourceKind.DATASET, label: "Dataset" },
    { value: ActivityResourceKind.EXAMPLE, label: "Example" },
    { value: ActivityResourceKind.OTHER, label: "Other" }
  ];
}

const resourceTextStatusLabels = {
  NOT_EXTRACTED: "Not extracted",
  READY: "Text ready",
  UNSUPPORTED: "Unsupported",
  FAILED: "Extraction failed"
} as const;

const resourceEmbeddingStatusLabels = {
  NOT_EMBEDDED: "Not embedded",
  READY: "Search ready",
  FAILED: "Embedding failed"
} as const;

function getResourceEmbeddingSummary(resource: ResourceWithEmbeddingSummary) {
  const chunks = resource.extractedTexts ?? [];
  const failedChunk = chunks.find(
    (chunk) => chunk.embeddingStatus === ActivityResourceEmbeddingStatus.FAILED
  );

  if (failedChunk) {
    return {
      status: ActivityResourceEmbeddingStatus.FAILED,
      error: failedChunk.embeddingError
    };
  }

  if (
    chunks.length > 0 &&
    chunks.every((chunk) => chunk.embeddingStatus === ActivityResourceEmbeddingStatus.READY)
  ) {
    return {
      status: ActivityResourceEmbeddingStatus.READY,
      error: null
    };
  }

  return {
    status: ActivityResourceEmbeddingStatus.NOT_EMBEDDED,
    error: null
  };
}

export function CreateModuleForm({
  classId,
  initialPosition = 1
}: {
  classId: string;
  initialPosition?: number;
}) {
  return (
    <LecturerActionForm action={createModuleAction} className="rounded-lg border border-ink/10 bg-white p-6 shadow-sm">
      <input name="classId" type="hidden" value={classId} />
      <TextField label="Region title" name="title" minLength={2} />
      <TextAreaField label="Description" name="description" />
      <TextField label="Position" name="position" type="number" defaultValue={String(initialPosition)} />
      <TextField label="Available from" name="availableFrom" type="date" required={false} />
      <label className="flex items-center gap-2 text-sm font-medium">
        <input name="isPublished" type="checkbox" /> Published
      </label>
      <button className="rounded-md bg-ink px-4 py-2 text-sm font-semibold text-white hover:bg-steel">
        Create region
      </button>
    </LecturerActionForm>
  );
}

export function UpdateModuleForm({ module }: { module: Module }) {
  return (
    <LecturerActionForm action={updateModuleAction} className="rounded-lg border border-ink/10 bg-white p-5 shadow-sm">
      <input name="classId" type="hidden" value={module.classId} />
      <input name="moduleId" type="hidden" value={module.id} />
      <TextField label="Region title" name="title" defaultValue={module.title} minLength={2} />
      <TextAreaField label="Description" name="description" defaultValue={module.description} />
      <TextField label="Position" name="position" type="number" defaultValue={String(module.position)} />
      <TextField
        label="Available from"
        name="availableFrom"
        type="date"
        defaultValue={dateInput(module.availableFrom)}
        required={false}
      />
      <label className="flex items-center gap-2 text-sm font-medium">
        <input name="isPublished" type="checkbox" defaultChecked={Boolean(boolDefault(module.isPublished))} /> Published
      </label>
      <button className="rounded-md bg-ink px-4 py-2 text-sm font-semibold text-white hover:bg-steel">
        Save region
      </button>
    </LecturerActionForm>
  );
}

export function PublishModuleForm({
  moduleId,
  buttonClassName = `${smallActionButton} border-moss/30 text-moss hover:bg-moss`
}: {
  moduleId: string;
  buttonClassName?: string;
}) {
  return (
    <LecturerActionForm action={publishModuleAction}>
      <input name="moduleId" type="hidden" value={moduleId} />
      <button className={buttonClassName}>
        Publish
      </button>
    </LecturerActionForm>
  );
}

export function DeleteModuleForm({
  moduleId,
  buttonClassName = `${smallActionButton} border-ember/30 text-ember hover:bg-ember`
}: {
  moduleId: string;
  buttonClassName?: string;
}) {
  return (
    <LecturerActionForm action={deleteModuleAction}>
      <input name="moduleId" type="hidden" value={moduleId} />
      <ConfirmAction
        className={buttonClassName}
        confirmLabel="Delete region"
        description="This deletes the region and its connected mission content according to the current database rules."
        label="Delete region"
        title="Delete this region?"
      />
    </LecturerActionForm>
  );
}

export function CreateActivityForm({
  moduleId,
  initialPosition = 1
}: {
  moduleId: string;
  initialPosition?: number;
}) {
  return (
    <LecturerActionForm action={createActivityAction} className="rounded-lg border border-ink/10 bg-white p-5 shadow-sm">
      <input name="moduleId" type="hidden" value={moduleId} />
      <SelectField
        label="Mission type"
        name="type"
        defaultValue={ActivityType.LESSON}
        options={Object.values(ActivityType).map((type) => ({ value: type, label: activityTypeLabel(type) }))}
      />
      <TextField label="Mission title" name="title" minLength={2} />
      <TextAreaField label="Description" name="description" />
      <TextAreaField label="Content or instructions" name="content" />
      <QuizBuilderFields />
      <div className="grid gap-4 sm:grid-cols-4">
        <TextField label="Position" name="position" type="number" defaultValue={String(initialPosition)} />
        <TextField label="Max score" name="maxScore" type="number" required={false} />
        <TextField label="Passing score" name="passingScore" type="number" required={false} />
        <TextField label="Max attempts" name="maxAttempts" type="number" required={false} />
      </div>
      <TextField label="Due date" name="dueAt" type="date" required={false} />
      <div className="flex flex-wrap gap-4">
        <label className="flex items-center gap-2 text-sm font-medium">
          <input name="isRequired" type="checkbox" defaultChecked /> Required
        </label>
        <label className="flex items-center gap-2 text-sm font-medium">
          <input name="isPublished" type="checkbox" /> Published
        </label>
      </div>
      <button className="rounded-md bg-ink px-4 py-2 text-sm font-semibold text-white hover:bg-steel">
        Create mission
      </button>
    </LecturerActionForm>
  );
}

export function UpdateActivityForm({ activity }: { activity: Activity }) {
  const quizQuestions =
    activity.type === ActivityType.QUIZ ? getQuizQuestionFieldDefaults(activity.content) : [];

  return (
    <LecturerActionForm action={updateActivityAction} className="rounded-lg border border-ink/10 bg-white p-5 shadow-sm">
      <input name="moduleId" type="hidden" value={activity.moduleId} />
      <input name="activityId" type="hidden" value={activity.id} />
      <SelectField
        label="Mission type"
        name="type"
        defaultValue={activity.type}
        options={Object.values(ActivityType).map((type) => ({ value: type, label: activityTypeLabel(type) }))}
      />
      <TextField label="Mission title" name="title" defaultValue={activity.title} minLength={2} />
      <TextAreaField label="Description" name="description" defaultValue={activity.description} />
      <TextAreaField
        label="Content or instructions"
        name="content"
        defaultValue={activity.type === ActivityType.QUIZ ? "" : activity.content}
      />
      <QuizBuilderFields questions={quizQuestions} />
      <div className="grid gap-4 sm:grid-cols-4">
        <TextField label="Position" name="position" type="number" defaultValue={String(activity.position)} />
        <TextField label="Max score" name="maxScore" type="number" defaultValue={activity.maxScore?.toString()} required={false} />
        <TextField label="Passing score" name="passingScore" type="number" defaultValue={activity.passingScore?.toString()} required={false} />
        <TextField label="Max attempts" name="maxAttempts" type="number" defaultValue={activity.maxAttempts?.toString()} required={false} />
      </div>
      <TextField label="Due date" name="dueAt" type="date" defaultValue={dateInput(activity.dueAt)} required={false} />
      <div className="flex flex-wrap gap-4">
        <label className="flex items-center gap-2 text-sm font-medium">
          <input name="isRequired" type="checkbox" defaultChecked={activity.isRequired} /> Required
        </label>
        <label className="flex items-center gap-2 text-sm font-medium">
          <input name="isPublished" type="checkbox" defaultChecked={activity.isPublished} /> Published
        </label>
      </div>
      <button className="rounded-md bg-ink px-4 py-2 text-sm font-semibold text-white hover:bg-steel">
        Save mission
      </button>
    </LecturerActionForm>
  );
}

export function PublishActivityForm({
  activityId,
  buttonClassName = `${smallActionButton} border-moss/30 text-moss hover:bg-moss`
}: {
  activityId: string;
  buttonClassName?: string;
}) {
  return (
    <LecturerActionForm action={publishActivityAction}>
      <input name="activityId" type="hidden" value={activityId} />
      <button className={buttonClassName}>
        Publish
      </button>
    </LecturerActionForm>
  );
}

export function DeleteActivityForm({
  activityId,
  buttonClassName = `${smallActionButton} border-ember/30 text-ember hover:bg-ember`
}: {
  activityId: string;
  buttonClassName?: string;
}) {
  return (
    <LecturerActionForm action={deleteActivityAction}>
      <input name="activityId" type="hidden" value={activityId} />
      <ConfirmAction
        className={buttonClassName}
        confirmLabel="Delete mission"
        description="This deletes the mission and related records according to the current database rules."
        label="Delete mission"
        title="Delete this mission?"
      />
    </LecturerActionForm>
  );
}

export function ActivityPrerequisiteForm({
  classId,
  activityId,
  activities,
  prerequisites
}: {
  classId: string;
  activityId: string;
  activities: ActivityOption[];
  prerequisites: PrerequisiteView[];
}) {
  const candidates = activities.filter(
    (activity) =>
      activity.id !== activityId &&
      !prerequisites.some((prerequisite) => prerequisite.requiredActivityId === activity.id)
  );

  return (
    <div className="rounded-lg border border-ink/10 bg-parchment/50 p-4">
      <h4 className="text-sm font-bold">Prerequisites</h4>
      <div className="mt-3 space-y-2">
        {prerequisites.length === 0 ? (
          <p className="text-sm text-ink/60">No prerequisite missions set.</p>
        ) : (
          prerequisites.map((prerequisite) => (
            <div
              className="flex flex-col gap-2 rounded-md border border-ink/10 bg-white p-3 sm:flex-row sm:items-center sm:justify-between"
              key={prerequisite.requiredActivityId}
            >
              <p className="text-sm">
                {prerequisite.requiredActivity.position}. {prerequisite.requiredActivity.title}
                {prerequisite.minimumScore
                  ? ` - minimum score ${prerequisite.minimumScore.toString()}`
                  : ""}
              </p>
              <LecturerActionForm action={removeActivityPrerequisiteAction}>
                <input name="classId" type="hidden" value={classId} />
                <input name="activityId" type="hidden" value={activityId} />
                <input
                  name="requiredActivityId"
                  type="hidden"
                  value={prerequisite.requiredActivityId}
                />
                <ConfirmAction
                  className="rounded-md border border-ember/30 bg-white px-3 py-1.5 text-xs font-semibold text-ember hover:bg-ember hover:text-white"
                  confirmLabel="Remove prerequisite"
                  description="This removes the prerequisite link. It does not delete either mission."
                  label="Remove prerequisite"
                  title="Remove this prerequisite?"
                />
              </LecturerActionForm>
            </div>
          ))
        )}
      </div>
      {candidates.length > 0 ? (
        <LecturerActionForm
          action={addActivityPrerequisiteAction}
          className="mt-4 border-t border-ink/10 pt-4"
        >
          <input name="classId" type="hidden" value={classId} />
          <input name="activityId" type="hidden" value={activityId} />
          <SelectField label="Required mission" name="requiredActivityId" options={activityOptions(candidates)} />
          <TextField label="Minimum score" name="minimumScore" type="number" required={false} />
          <button className="rounded-md border border-ink/20 bg-white px-3 py-2 text-sm font-semibold hover:bg-ink hover:text-white">
            Add prerequisite
          </button>
        </LecturerActionForm>
      ) : (
        <p className="mt-3 text-sm text-ink/60">No available prerequisite candidates.</p>
      )}
    </div>
  );
}

export function MissionResourcesPanel({
  activityId,
  classId,
  moduleId,
  resources
}: {
  activityId: string;
  classId: string;
  moduleId: string;
  resources: ResourceWithEmbeddingSummary[];
}) {
  return (
    <div className="rounded-lg border border-ink/10 bg-parchment/50 p-4">
      <h4 className="text-sm font-bold">Resources</h4>
      <p className="mt-1 text-sm text-ink/60">
        Upload files students can download from this mission.
      </p>
      <div className="mt-3 space-y-2">
        {resources.length === 0 ? (
          <p className="text-sm text-ink/60">No resources added yet.</p>
        ) : (
          resources.map((resource) => (
            <div className="space-y-3" key={resource.id}>
              {(() => {
                const embeddingSummary = getResourceEmbeddingSummary(resource);
                return (
              <ResourceFileCard
                actionSlot={
                  <div className="flex flex-col items-start gap-2 sm:items-end">
                    <span
                      className={`rounded-full border px-2.5 py-1 text-xs font-bold ${
                        resource.textStatus === "READY"
                          ? "border-moss/30 bg-moss/10 text-moss"
                          : resource.textStatus === "FAILED"
                            ? "border-ember/30 bg-ember/10 text-ember"
                            : "border-border/80 bg-surface-muted text-ink/60"
                      }`}
                      title={resource.textError ?? undefined}
                    >
                      {resourceTextStatusLabels[resource.textStatus]}
                    </span>
                    <span
                      className={`rounded-full border px-2.5 py-1 text-xs font-bold ${
                        embeddingSummary.status === ActivityResourceEmbeddingStatus.READY
                          ? "border-moss/30 bg-moss/10 text-moss"
                          : embeddingSummary.status === ActivityResourceEmbeddingStatus.FAILED
                            ? "border-ember/30 bg-ember/10 text-ember"
                            : "border-border/80 bg-surface-muted text-ink/60"
                      }`}
                      title={embeddingSummary.error ?? undefined}
                    >
                      {resourceEmbeddingStatusLabels[embeddingSummary.status]}
                    </span>
                    {resource.textStatus === "FAILED" || resource.textStatus === "NOT_EXTRACTED" ? (
                      <LecturerActionForm action={retryActivityResourceExtractionAction}>
                        <input name="classId" type="hidden" value={classId} />
                        <input name="moduleId" type="hidden" value={moduleId} />
                        <input name="activityId" type="hidden" value={activityId} />
                        <input name="resourceId" type="hidden" value={resource.id} />
                        <button className="rounded-md border border-ink/20 bg-white px-3 py-1.5 text-xs font-semibold hover:bg-ink hover:text-white">
                          Retry extraction
                        </button>
                      </LecturerActionForm>
                    ) : null}
                    {resource.textStatus === "READY" || resource.textStatus === "FAILED" ? (
                      <LecturerActionForm action={clearActivityResourceExtractionAction}>
                        <input name="classId" type="hidden" value={classId} />
                        <input name="moduleId" type="hidden" value={moduleId} />
                        <input name="activityId" type="hidden" value={activityId} />
                        <input name="resourceId" type="hidden" value={resource.id} />
                        <ConfirmAction
                          className="rounded-md border border-ink/20 bg-white px-3 py-1.5 text-xs font-semibold text-ink/65 hover:bg-ink hover:text-white"
                          confirmLabel="Clear extracted text"
                          description="This removes stored text chunks from AI context. The uploaded file remains available."
                          label="Clear extracted text"
                          title="Clear extracted text?"
                        />
                      </LecturerActionForm>
                    ) : null}
                    {resource.textStatus === "READY" &&
                    (embeddingSummary.status === ActivityResourceEmbeddingStatus.FAILED ||
                      embeddingSummary.status === ActivityResourceEmbeddingStatus.NOT_EMBEDDED) ? (
                      <LecturerActionForm action={retryActivityResourceEmbeddingsAction}>
                        <input name="classId" type="hidden" value={classId} />
                        <input name="moduleId" type="hidden" value={moduleId} />
                        <input name="activityId" type="hidden" value={activityId} />
                        <input name="resourceId" type="hidden" value={resource.id} />
                        <button className="rounded-md border border-ink/20 bg-white px-3 py-1.5 text-xs font-semibold hover:bg-ink hover:text-white">
                          Retry search
                        </button>
                      </LecturerActionForm>
                    ) : null}
                    {embeddingSummary.status === ActivityResourceEmbeddingStatus.READY ||
                    embeddingSummary.status === ActivityResourceEmbeddingStatus.FAILED ? (
                      <LecturerActionForm action={clearActivityResourceEmbeddingsAction}>
                        <input name="classId" type="hidden" value={classId} />
                        <input name="moduleId" type="hidden" value={moduleId} />
                        <input name="activityId" type="hidden" value={activityId} />
                        <input name="resourceId" type="hidden" value={resource.id} />
                        <ConfirmAction
                          className="rounded-md border border-ink/20 bg-white px-3 py-1.5 text-xs font-semibold text-ink/65 hover:bg-ink hover:text-white"
                          confirmLabel="Clear search"
                          description="This removes stored vector embeddings for semantic search. Extracted text remains available."
                          label="Clear search"
                          title="Clear search embeddings?"
                        />
                      </LecturerActionForm>
                    ) : null}
                    <LecturerActionForm action={deleteActivityResourceAction}>
                      <input name="classId" type="hidden" value={classId} />
                      <input name="moduleId" type="hidden" value={moduleId} />
                      <input name="activityId" type="hidden" value={activityId} />
                      <input name="resourceId" type="hidden" value={resource.id} />
                      <ConfirmAction
                        className="rounded-md border border-ember/30 bg-white px-3 py-1.5 text-xs font-semibold text-ember hover:bg-ember hover:text-white"
                        confirmLabel="Remove resource"
                        description="This removes the resource from the mission. The uploaded object is not deleted from storage in this pass."
                        label="Remove resource"
                        title="Remove this resource?"
                      />
                    </LecturerActionForm>
                  </div>
                }
                activityId={activityId}
                contentType={resource.contentType}
                createdAt={resource.createdAt}
                description={resource.description}
                fileName={resource.fileName}
                fileUrl={resource.fileUrl}
                intent="MISSION_RESOURCE"
                isRequired={resource.isRequired}
                kind={resource.kind}
                position={resource.position}
                size={resource.size}
                title={resource.title}
              />
                );
              })()}
              <details className="rounded-lg border border-border/80 bg-surface p-4">
                <summary className="cursor-pointer list-none text-sm font-bold text-ink/75">
                  Edit details
                </summary>
                <LecturerActionForm
                  action={updateActivityResourceAction}
                  className="mt-4 grid gap-3"
                >
                  <input name="classId" type="hidden" value={classId} />
                  <input name="moduleId" type="hidden" value={moduleId} />
                  <input name="activityId" type="hidden" value={activityId} />
                  <input name="resourceId" type="hidden" value={resource.id} />
                  <TextField label="Resource title" name="title" defaultValue={resource.title} minLength={2} />
                  <TextAreaField
                    label="Description"
                    name="description"
                    defaultValue={resource.description}
                    required={false}
                  />
                  <div className="grid gap-3 sm:grid-cols-2">
                    <SelectField
                      defaultValue={resource.kind}
                      label="Resource label"
                      name="kind"
                      options={resourceKindOptions()}
                    />
                    <TextField
                      defaultValue={String(resource.position)}
                      label="Position"
                      name="position"
                      type="number"
                    />
                  </div>
                  <label className="flex items-center gap-2 text-sm font-medium">
                    <input name="isRequired" type="checkbox" defaultChecked={resource.isRequired} /> Required resource
                  </label>
                  <button className="w-fit rounded-md border border-ink/20 bg-white px-3 py-2 text-sm font-semibold hover:bg-ink hover:text-white">
                    Save resource details
                  </button>
                </LecturerActionForm>
              </details>
            </div>
          ))
        )}
      </div>
      <LecturerActionForm
        action={createActivityResourceAction}
        className="mt-4 border-t border-ink/10 pt-4"
      >
        <input name="classId" type="hidden" value={classId} />
        <input name="moduleId" type="hidden" value={moduleId} />
        <input name="activityId" type="hidden" value={activityId} />
        <TextField label="Resource title" name="title" minLength={2} />
        <TextAreaField label="Description" name="description" required={false} />
        <SelectField
          defaultValue={ActivityResourceKind.OTHER}
          label="Resource label"
          name="kind"
          options={resourceKindOptions()}
        />
        <TextField
          defaultValue={String(resources.length + 1)}
          label="Position"
          name="position"
          type="number"
        />
        <label className="flex items-center gap-2 text-sm font-medium">
          <input name="isRequired" type="checkbox" /> Required resource
        </label>
        <MissionResourceUpload activityId={activityId} />
        <button className="rounded-md border border-ink/20 bg-white px-3 py-2 text-sm font-semibold hover:bg-ink hover:text-white">
          Add resource
        </button>
      </LecturerActionForm>
    </div>
  );
}

export function CreateAnnouncementForm({ classId }: { classId: string }) {
  return (
    <LecturerActionForm action={createAnnouncementAction} className="rounded-lg border border-border/80 bg-surface p-6 shadow-sm">
      <input name="classId" type="hidden" value={classId} />
      <TextField label="Announcement title" name="title" maxLength={140} minLength={2} />
      <TextAreaField label="Update" name="body" maxLength={5000} minLength={2} required />
      <SelectField
        defaultValue={AnnouncementStatus.DRAFT}
        label="Status"
        name="status"
        options={[
          { value: AnnouncementStatus.DRAFT, label: "Draft" },
          { value: AnnouncementStatus.PUBLISHED, label: "Published" }
        ]}
      />
      <button className="rounded-md bg-ink px-4 py-2 text-sm font-semibold text-white hover:bg-steel">
        Create announcement
      </button>
    </LecturerActionForm>
  );
}

export function UpdateAnnouncementForm({ announcement }: { announcement: Announcement }) {
  return (
    <LecturerActionForm action={updateAnnouncementAction} className="rounded-lg border border-border/80 bg-surface p-6 shadow-sm">
      <input name="classId" type="hidden" value={announcement.classId} />
      <input name="announcementId" type="hidden" value={announcement.id} />
      <TextField label="Announcement title" name="title" defaultValue={announcement.title} maxLength={140} minLength={2} />
      <TextAreaField
        label="Update"
        name="body"
        defaultValue={announcement.body}
        maxLength={5000}
        minLength={2}
        required
      />
      <SelectField
        defaultValue={announcement.status}
        label="Status"
        name="status"
        options={[
          { value: AnnouncementStatus.DRAFT, label: "Draft" },
          { value: AnnouncementStatus.PUBLISHED, label: "Published" },
          { value: AnnouncementStatus.ARCHIVED, label: "Archived" }
        ]}
      />
      <button className="rounded-md bg-ink px-4 py-2 text-sm font-semibold text-white hover:bg-steel">
        Save announcement
      </button>
    </LecturerActionForm>
  );
}

export function PublishAnnouncementForm({
  announcementId,
  classId,
  buttonClassName = `${smallActionButton} border-moss/30 text-moss hover:bg-moss`
}: {
  announcementId: string;
  classId: string;
  buttonClassName?: string;
}) {
  return (
    <LecturerActionForm action={publishAnnouncementAction}>
      <input name="classId" type="hidden" value={classId} />
      <input name="announcementId" type="hidden" value={announcementId} />
      <button className={buttonClassName}>Publish</button>
    </LecturerActionForm>
  );
}

export function ArchiveAnnouncementForm({
  announcementId,
  classId,
  buttonClassName = `${smallActionButton} border-steel/30 text-steel hover:bg-steel`
}: {
  announcementId: string;
  classId: string;
  buttonClassName?: string;
}) {
  return (
    <LecturerActionForm action={archiveAnnouncementAction}>
      <input name="classId" type="hidden" value={classId} />
      <input name="announcementId" type="hidden" value={announcementId} />
      <button className={buttonClassName}>Archive</button>
    </LecturerActionForm>
  );
}

export function DeleteAnnouncementForm({
  announcementId,
  classId,
  buttonClassName = `${smallActionButton} border-ember/30 text-ember hover:bg-ember`
}: {
  announcementId: string;
  classId: string;
  buttonClassName?: string;
}) {
  return (
    <LecturerActionForm action={deleteAnnouncementAction}>
      <input name="classId" type="hidden" value={classId} />
      <input name="announcementId" type="hidden" value={announcementId} />
      <ConfirmAction
        className={buttonClassName}
        confirmLabel="Delete announcement"
        description="This permanently removes the announcement from this realm."
        label="Delete announcement"
        title="Delete this announcement?"
      />
    </LecturerActionForm>
  );
}

export function CreateQuestForm({
  classId,
  initialPosition = 1
}: {
  classId: string;
  initialPosition?: number;
}) {
  return (
    <LecturerActionForm action={createQuestAction} className="rounded-lg border border-ink/10 bg-white p-6 shadow-sm">
      <input name="classId" type="hidden" value={classId} />
      <TextField label="Quest title" name="title" minLength={2} />
      <TextAreaField label="Description" name="description" />
      <SelectField
        label="Quest type"
        name="type"
        defaultValue={QuestType.MAIN}
        options={Object.values(QuestType).map((type) => ({ value: type, label: type }))}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField label="Position" name="position" type="number" defaultValue={String(initialPosition)} />
        <TextField label="XP reward" name="xpReward" type="number" defaultValue="100" />
      </div>
      <div className="flex flex-wrap gap-4">
        <label className="flex items-center gap-2 text-sm font-medium">
          <input name="isOptional" type="checkbox" /> Optional
        </label>
        <label className="flex items-center gap-2 text-sm font-medium">
          <input name="isPublished" type="checkbox" /> Published
        </label>
      </div>
      <button className="rounded-md bg-ink px-4 py-2 text-sm font-semibold text-white hover:bg-steel">
        Create quest
      </button>
    </LecturerActionForm>
  );
}

export function UpdateQuestForm({ quest }: { quest: Quest }) {
  return (
    <LecturerActionForm action={updateQuestAction} className="rounded-lg border border-ink/10 bg-white p-5 shadow-sm">
      <input name="classId" type="hidden" value={quest.classId} />
      <input name="questId" type="hidden" value={quest.id} />
      <TextField label="Quest title" name="title" defaultValue={quest.title} minLength={2} />
      <TextAreaField label="Description" name="description" defaultValue={quest.description} />
      <SelectField
        label="Quest type"
        name="type"
        defaultValue={quest.type}
        options={Object.values(QuestType).map((type) => ({ value: type, label: type }))}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField label="Position" name="position" type="number" defaultValue={String(quest.position)} />
        <TextField label="XP reward" name="xpReward" type="number" defaultValue={String(quest.xpReward)} />
      </div>
      <div className="flex flex-wrap gap-4">
        <label className="flex items-center gap-2 text-sm font-medium">
          <input name="isOptional" type="checkbox" defaultChecked={quest.isOptional} /> Optional
        </label>
        <label className="flex items-center gap-2 text-sm font-medium">
          <input name="isPublished" type="checkbox" defaultChecked={quest.isPublished} /> Published
        </label>
      </div>
      <button className="rounded-md bg-ink px-4 py-2 text-sm font-semibold text-white hover:bg-steel">
        Save quest
      </button>
    </LecturerActionForm>
  );
}

export function PublishQuestForm({
  questId,
  buttonClassName = `${smallActionButton} border-moss/30 text-moss hover:bg-moss`
}: {
  questId: string;
  buttonClassName?: string;
}) {
  return (
    <LecturerActionForm action={publishQuestAction}>
      <input name="questId" type="hidden" value={questId} />
      <button className={buttonClassName}>
        Publish
      </button>
    </LecturerActionForm>
  );
}

export function DeleteQuestForm({
  questId,
  buttonClassName = `${smallActionButton} border-ember/30 text-ember hover:bg-ember`
}: {
  questId: string;
  buttonClassName?: string;
}) {
  return (
    <LecturerActionForm action={deleteQuestAction}>
      <input name="questId" type="hidden" value={questId} />
      <ConfirmAction
        className={buttonClassName}
        confirmLabel="Delete quest"
        description="This deletes the quest and its mission connections. Existing XP transaction history stays untouched."
        label="Delete quest"
        title="Delete this quest?"
      />
    </LecturerActionForm>
  );
}

export const lecturerMenuItemClassName = menuItemButton;
export const lecturerMenuDangerClassName = menuDangerButton;

export function ConnectQuestActivityForm({
  classId,
  questId,
  activities,
  initialPosition = 1
}: {
  classId: string;
  questId: string;
  activities: ActivityOption[];
  initialPosition?: number;
}) {
  return (
    <LecturerActionForm action={connectQuestActivityAction} className="mt-4 border-t border-ink/10 pt-4">
      <input name="classId" type="hidden" value={classId} />
      <input name="questId" type="hidden" value={questId} />
      <SelectField label="Mission" name="activityId" options={activityOptions(activities)} />
      <TextField label="Quest order" name="position" type="number" defaultValue={String(initialPosition)} />
      <button className="rounded-md border border-ink/20 bg-white px-3 py-2 text-sm font-semibold hover:bg-ink hover:text-white">
        Connect mission
      </button>
    </LecturerActionForm>
  );
}

export function RemoveQuestActivityForm({
  classId,
  questId,
  activityId
}: {
  classId: string;
  questId: string;
  activityId: string;
}) {
  return (
    <LecturerActionForm action={removeQuestActivityAction}>
      <input name="classId" type="hidden" value={classId} />
      <input name="questId" type="hidden" value={questId} />
      <input name="activityId" type="hidden" value={activityId} />
      <ConfirmAction
        className="rounded-md border border-ember/30 bg-white px-3 py-1.5 text-xs font-semibold text-ember hover:bg-ember hover:text-white"
        confirmLabel="Remove from quest"
        description="This removes the mission from this quest. It does not delete the mission itself."
        label="Remove from quest"
        title="Remove this mission from the quest?"
      />
    </LecturerActionForm>
  );
}

export function GradeSubmissionForm({
  submissionId,
  returnTo
}: {
  submissionId: string;
  returnTo?: string;
}) {
  return (
    <LecturerActionForm action={gradeSubmissionAction}>
      <input name="submissionId" type="hidden" value={submissionId} />
      {returnTo ? <input name="returnTo" type="hidden" value={returnTo} /> : null}
      <div className="grid gap-3 sm:grid-cols-[120px_1fr_auto]">
        <TextField label="Score" name="score" type="number" />
        <TextAreaField label="Feedback" name="feedback" required={false} />
        <button className="self-end rounded-md bg-ink px-4 py-2 text-sm font-semibold text-white hover:bg-steel">
          Grade
        </button>
      </div>
    </LecturerActionForm>
  );
}

export function ReturnSubmissionForm({
  submissionId,
  returnTo
}: {
  submissionId: string;
  returnTo?: string;
}) {
  return (
    <LecturerActionForm
      action={returnSubmissionAction}
      className="rounded-lg border border-ember/20 bg-ember/5 p-4"
    >
      <input name="submissionId" type="hidden" value={submissionId} />
      {returnTo ? <input name="returnTo" type="hidden" value={returnTo} /> : null}
      <TextAreaField label="Revision feedback" name="returnFeedback" />
      <button className="rounded-md border border-ember/30 bg-white px-4 py-2 text-sm font-semibold text-ember hover:bg-ember hover:text-white">
        Return for revision
      </button>
    </LecturerActionForm>
  );
}

export function PublishGradeForm({
  gradeId,
  returnTo
}: {
  gradeId: string;
  returnTo?: string;
}) {
  return (
    <LecturerActionForm action={publishGradeAction}>
      <input name="gradeId" type="hidden" value={gradeId} />
      {returnTo ? <input name="returnTo" type="hidden" value={returnTo} /> : null}
      <button className="rounded-md border border-moss/30 bg-white px-3 py-1.5 text-xs font-semibold text-moss hover:bg-moss hover:text-white">
        Publish grade
      </button>
    </LecturerActionForm>
  );
}
