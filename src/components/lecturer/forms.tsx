import { ActivityType, QuestType, type Activity, type Module, type Quest } from "@prisma/client";

import {
  addActivityPrerequisiteAction,
  connectQuestActivityAction,
  createActivityAction,
  createModuleAction,
  createQuestAction,
  deleteActivityAction,
  deleteModuleAction,
  deleteQuestAction,
  gradeSubmissionAction,
  publishActivityAction,
  publishGradeAction,
  publishModuleAction,
  publishQuestAction,
  removeActivityPrerequisiteAction,
  updateActivityAction,
  updateModuleAction,
  updateQuestAction
} from "@/app/lecturer/actions";
import { LecturerActionForm } from "@/components/lecturer/action-form";
import { SelectField, TextAreaField, TextField } from "@/components/admin/form-fields";

type ActivityOption = Pick<Activity, "id" | "title" | "position" | "type">;
type PrerequisiteView = {
  requiredActivityId: string;
  minimumScore: { toString(): string } | null;
  requiredActivity: ActivityOption;
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
    label: `${activity.position}. ${activity.title} (${activity.type})`
  }));
}

export function CreateModuleForm({ classId }: { classId: string }) {
  return (
    <LecturerActionForm action={createModuleAction} className="rounded-lg border border-ink/10 bg-white p-6 shadow-sm">
      <input name="classId" type="hidden" value={classId} />
      <TextField label="Region title" name="title" />
      <TextAreaField label="Description" name="description" />
      <TextField label="Position" name="position" type="number" defaultValue="1" />
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
      <TextField label="Region title" name="title" defaultValue={module.title} />
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
      <button className={buttonClassName}>
        Delete
      </button>
    </LecturerActionForm>
  );
}

export function CreateActivityForm({ moduleId }: { moduleId: string }) {
  return (
    <LecturerActionForm action={createActivityAction} className="rounded-lg border border-ink/10 bg-white p-5 shadow-sm">
      <input name="moduleId" type="hidden" value={moduleId} />
      <SelectField
        label="Mission type"
        name="type"
        defaultValue={ActivityType.LESSON}
        options={Object.values(ActivityType).map((type) => ({ value: type, label: type }))}
      />
      <TextField label="Mission title" name="title" />
      <TextAreaField label="Description" name="description" />
      <TextAreaField label="Content or instructions" name="content" />
      <div className="grid gap-4 sm:grid-cols-3">
        <TextField label="Position" name="position" type="number" defaultValue="1" />
        <TextField label="Max score" name="maxScore" type="number" required={false} />
        <TextField label="Passing score" name="passingScore" type="number" required={false} />
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
  return (
    <LecturerActionForm action={updateActivityAction} className="rounded-lg border border-ink/10 bg-white p-5 shadow-sm">
      <input name="moduleId" type="hidden" value={activity.moduleId} />
      <input name="activityId" type="hidden" value={activity.id} />
      <SelectField
        label="Mission type"
        name="type"
        defaultValue={activity.type}
        options={Object.values(ActivityType).map((type) => ({ value: type, label: type }))}
      />
      <TextField label="Mission title" name="title" defaultValue={activity.title} />
      <TextAreaField label="Description" name="description" defaultValue={activity.description} />
      <TextAreaField label="Content or instructions" name="content" defaultValue={activity.content} />
      <div className="grid gap-4 sm:grid-cols-3">
        <TextField label="Position" name="position" type="number" defaultValue={String(activity.position)} />
        <TextField label="Max score" name="maxScore" type="number" defaultValue={activity.maxScore?.toString()} required={false} />
        <TextField label="Passing score" name="passingScore" type="number" defaultValue={activity.passingScore?.toString()} required={false} />
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
      <button className={buttonClassName}>
        Delete
      </button>
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
                <button className="rounded-md border border-ember/30 bg-white px-3 py-1.5 text-xs font-semibold text-ember hover:bg-ember hover:text-white">
                  Remove
                </button>
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

export function CreateQuestForm({ classId }: { classId: string }) {
  return (
    <LecturerActionForm action={createQuestAction} className="rounded-lg border border-ink/10 bg-white p-6 shadow-sm">
      <input name="classId" type="hidden" value={classId} />
      <TextField label="Quest title" name="title" />
      <TextAreaField label="Description" name="description" />
      <SelectField
        label="Quest type"
        name="type"
        defaultValue={QuestType.MAIN}
        options={Object.values(QuestType).map((type) => ({ value: type, label: type }))}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField label="Position" name="position" type="number" defaultValue="1" />
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
      <TextField label="Quest title" name="title" defaultValue={quest.title} />
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
      <button className={buttonClassName}>
        Delete
      </button>
    </LecturerActionForm>
  );
}

export const lecturerMenuItemClassName = menuItemButton;
export const lecturerMenuDangerClassName = menuDangerButton;

export function ConnectQuestActivityForm({
  questId,
  activities
}: {
  questId: string;
  activities: ActivityOption[];
}) {
  return (
    <LecturerActionForm action={connectQuestActivityAction} className="mt-4 border-t border-ink/10 pt-4">
      <input name="questId" type="hidden" value={questId} />
      <SelectField label="Mission" name="activityId" options={activityOptions(activities)} />
      <TextField label="Quest order" name="position" type="number" defaultValue="1" />
      <button className="rounded-md border border-ink/20 bg-white px-3 py-2 text-sm font-semibold hover:bg-ink hover:text-white">
        Connect mission
      </button>
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
        <TextField label="Feedback" name="feedback" required={false} />
        <button className="self-end rounded-md bg-ink px-4 py-2 text-sm font-semibold text-white hover:bg-steel">
          Grade
        </button>
      </div>
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
