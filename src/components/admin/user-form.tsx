import { UserRole, UserStatus, type User } from "@prisma/client";

import {
  createUserAction,
  deactivateUserAction,
  resetUserPasswordAction,
  updateUserAction
} from "@/app/admin/actions";
import { ActionForm } from "@/components/admin/action-form";
import { roleOptions, SelectField, TextField, userStatusOptions } from "@/components/admin/form-fields";
import { ConfirmAction } from "@/components/ui/confirm-action";

export function CreateUserForm() {
  return (
    <ActionForm action={createUserAction} className="rounded-lg border border-ink/10 bg-white p-6 shadow-sm">
      <TextField label="Name" name="name" />
      <TextField label="Email" name="email" type="email" />
      <TextField label="Temporary password" name="password" type="password" />
      <SelectField label="Role" name="role" defaultValue={UserRole.STUDENT} options={roleOptions} />
      <SelectField
        label="Status"
        name="status"
        defaultValue={UserStatus.ACTIVE}
        options={userStatusOptions}
      />
      <TextField label="Avatar URL" name="avatarUrl" required={false} />
      <button className="rounded-md bg-ink px-4 py-2 text-sm font-semibold text-white hover:bg-steel">
        Create user
      </button>
    </ActionForm>
  );
}

export function UpdateUserForm({ user }: { user: User }) {
  return (
    <ActionForm action={updateUserAction} className="rounded-lg border border-ink/10 bg-white p-6 shadow-sm">
      <input name="userId" type="hidden" value={user.id} />
      <TextField label="Name" name="name" defaultValue={user.name} />
      <TextField label="Email" name="email" type="email" defaultValue={user.email} />
      <SelectField label="Role" name="role" defaultValue={user.role} options={roleOptions} />
      <SelectField label="Status" name="status" defaultValue={user.status} options={userStatusOptions} />
      <TextField label="Avatar URL" name="avatarUrl" defaultValue={user.avatarUrl} required={false} />
      <button className="rounded-md bg-ink px-4 py-2 text-sm font-semibold text-white hover:bg-steel">
        Save user
      </button>
    </ActionForm>
  );
}

export function DeactivateUserForm({ userId }: { userId: string }) {
  return (
    <ActionForm action={deactivateUserAction}>
      <input name="userId" type="hidden" value={userId} />
      <ConfirmAction
        className="rounded-md border border-ember/30 bg-white px-4 py-2 text-sm font-semibold text-ember hover:bg-ember hover:text-white"
        confirmLabel="Deactivate user"
        description="This prevents the user from signing in while preserving their historical records."
        label="Deactivate user"
        title="Deactivate this user?"
      />
    </ActionForm>
  );
}

export function ResetUserPasswordForm({ userId }: { userId: string }) {
  return (
    <ActionForm action={resetUserPasswordAction} className="mt-5 border-t border-ink/10 pt-5">
      <input name="userId" type="hidden" value={userId} />
      <TextField label="Temporary password" name="newPassword" type="password" />
      <TextField label="Confirm temporary password" name="confirmPassword" type="password" />
      <button className="rounded-md bg-ink px-4 py-2 text-sm font-semibold text-white hover:bg-steel">
        Reset password
      </button>
    </ActionForm>
  );
}
