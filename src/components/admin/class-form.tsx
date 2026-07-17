import { ClassStatus, type Class, type User } from "@prisma/client";

import {
  createClassAction,
  enrollStudentAction,
  removeStudentAction,
  updateClassAction
} from "@/app/admin/actions";
import { ActionForm } from "@/components/admin/action-form";
import {
  classStatusOptions,
  SelectField,
  TextAreaField,
  TextField
} from "@/components/admin/form-fields";
import { ConfirmAction } from "@/components/ui/confirm-action";

function toDateInputValue(value?: Date | null) {
  return value ? value.toISOString().slice(0, 10) : "";
}

function lecturerOptions(lecturers: User[]) {
  return lecturers.map((lecturer) => ({
    value: lecturer.id,
    label: `${lecturer.name} (${lecturer.email})`
  }));
}

export function CreateClassForm({ lecturers }: { lecturers: User[] }) {
  return (
    <ActionForm action={createClassAction} className="rounded-lg border border-ink/10 bg-white p-6 shadow-sm">
      <TextField label="Realm name" name="name" />
      <TextField label="Class code" name="code" />
      <TextAreaField label="Description" name="description" />
      <SelectField label="Lecturer" name="lecturerId" options={lecturerOptions(lecturers)} />
      <SelectField
        label="Status"
        name="status"
        defaultValue={ClassStatus.DRAFT}
        options={classStatusOptions}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField label="Start date" name="startDate" type="date" required={false} />
        <TextField label="End date" name="endDate" type="date" required={false} />
      </div>
      <button className="rounded-md bg-ink px-4 py-2 text-sm font-semibold text-white hover:bg-steel">
        Create class
      </button>
    </ActionForm>
  );
}

export function UpdateClassForm({
  teachingClass,
  lecturers
}: {
  teachingClass: Class;
  lecturers: User[];
}) {
  return (
    <ActionForm action={updateClassAction} className="rounded-lg border border-ink/10 bg-white p-6 shadow-sm">
      <input name="classId" type="hidden" value={teachingClass.id} />
      <TextField label="Realm name" name="name" defaultValue={teachingClass.name} />
      <TextField label="Class code" name="code" defaultValue={teachingClass.code} />
      <TextAreaField label="Description" name="description" defaultValue={teachingClass.description} />
      <SelectField
        label="Lecturer"
        name="lecturerId"
        defaultValue={teachingClass.lecturerId}
        options={lecturerOptions(lecturers)}
      />
      <SelectField
        label="Status"
        name="status"
        defaultValue={teachingClass.status}
        options={classStatusOptions}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label="Start date"
          name="startDate"
          type="date"
          defaultValue={toDateInputValue(teachingClass.startDate)}
          required={false}
        />
        <TextField
          label="End date"
          name="endDate"
          type="date"
          defaultValue={toDateInputValue(teachingClass.endDate)}
          required={false}
        />
      </div>
      <button className="rounded-md bg-ink px-4 py-2 text-sm font-semibold text-white hover:bg-steel">
        Save class
      </button>
    </ActionForm>
  );
}

export function EnrollStudentForm({
  classId,
  students
}: {
  classId: string;
  students: Pick<User, "id" | "name" | "email">[];
}) {
  return (
    <ActionForm action={enrollStudentAction} className="rounded-lg border border-ink/10 bg-white p-6 shadow-sm">
      <input name="classId" type="hidden" value={classId} />
      <SelectField
        label="Student"
        name="studentId"
        options={students.map((student) => ({
          value: student.id,
          label: `${student.name} (${student.email})`
        }))}
      />
      <button className="rounded-md bg-ink px-4 py-2 text-sm font-semibold text-white hover:bg-steel">
        Enroll student
      </button>
    </ActionForm>
  );
}

export function RemoveStudentForm({ classId, studentId }: { classId: string; studentId: string }) {
  return (
    <ActionForm action={removeStudentAction}>
      <input name="classId" type="hidden" value={classId} />
      <input name="studentId" type="hidden" value={studentId} />
      <ConfirmAction
        className="rounded-md border border-ember/30 bg-white px-3 py-1.5 text-xs font-semibold text-ember hover:bg-ember hover:text-white"
        confirmLabel="Remove student"
        description="This removes the student's active enrollment while keeping historical records intact."
        label="Remove student"
        title="Remove this student from the realm?"
      />
    </ActionForm>
  );
}
