import { ActivityType, QuestType, type Activity, type Module, type Quest } from "@prisma/client";

import {
  connectQuestActivityAction,
  createActivityAction,
  createModuleAction,
  createQuestAction,
  deleteActivityAction,
  deleteModuleAction,
  gradeSubmissionAction,
  publishActivityAction,
  publishGradeAction,
  publishModuleAction,
  publishQuestAction,
  updateActivityAction,
  updateModuleAction,
  updateQuestAction
} from "@/app/lecturer/actions";
import { LecturerActionForm } from "@/components/lecturer/action-form";
import { SelectField, TextAreaField, TextField } from "@/components/admin/form-fields";

type ActivityOption = Pick<Activity, "id" | "title" | "position" | "type">;

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

export function PublishModuleForm({ moduleId }: { moduleId: string }) {
  return (
    <LecturerActionForm action={publishModuleAction}>
      <input name="moduleId" type="hidden" value={moduleId} />
      <button className="rounded-md border border-moss/30 bg-white px-3 py-1.5 text-xs font-semibold text-moss hover:bg-moss hover:text-white">
        Publish
      </button>
    </LecturerActionForm>
  );
}

export function DeleteModuleForm({ moduleId }: { moduleId: string }) {
  return (
    <LecturerActionForm action={deleteModuleAction}>
      <input name="moduleId" type="hidden" value={moduleId} />
      <button className="rounded-md border border-ember/30 bg-white px-3 py-1.5 text-xs font-semibold text-ember hover:bg-ember hover:text-white">
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

export function PublishActivityForm({ activityId }: { activityId: string }) {
  return (
    <LecturerActionForm action={publishActivityAction}>
      <input name="activityId" type="hidden" value={activityId} />
      <button className="rounded-md border border-moss/30 bg-white px-3 py-1.5 text-xs font-semibold text-moss hover:bg-moss hover:text-white">
        Publish
      </button>
    </LecturerActionForm>
  );
}

export function DeleteActivityForm({ activityId }: { activityId: string }) {
  return (
    <LecturerActionForm action={deleteActivityAction}>
      <input name="activityId" type="hidden" value={activityId} />
      <button className="rounded-md border border-ember/30 bg-white px-3 py-1.5 text-xs font-semibold text-ember hover:bg-ember hover:text-white">
        Delete
      </button>
    </LecturerActionForm>
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

export function PublishQuestForm({ questId }: { questId: string }) {
  return (
    <LecturerActionForm action={publishQuestAction}>
      <input name="questId" type="hidden" value={questId} />
      <button className="rounded-md border border-moss/30 bg-white px-3 py-1.5 text-xs font-semibold text-moss hover:bg-moss hover:text-white">
        Publish
      </button>
    </LecturerActionForm>
  );
}

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

export function GradeSubmissionForm({ submissionId }: { submissionId: string }) {
  return (
    <LecturerActionForm action={gradeSubmissionAction}>
      <input name="submissionId" type="hidden" value={submissionId} />
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

export function PublishGradeForm({ gradeId }: { gradeId: string }) {
  return (
    <LecturerActionForm action={publishGradeAction}>
      <input name="gradeId" type="hidden" value={gradeId} />
      <button className="rounded-md border border-moss/30 bg-white px-3 py-1.5 text-xs font-semibold text-moss hover:bg-moss hover:text-white">
        Publish grade
      </button>
    </LecturerActionForm>
  );
}
