import type { User } from "@prisma/client";

import {
  changeOwnPasswordAction,
  updateOwnProfileAction
} from "@/app/account/actions";
import { AccountActionForm } from "@/components/account/action-form";
import { AvatarUpload } from "@/components/account/avatar-upload";
import { TextField } from "@/components/admin/form-fields";

export function UpdateOwnProfileForm({ user }: { user: Pick<User, "name" | "avatarUrl"> }) {
  return (
    <AccountActionForm action={updateOwnProfileAction} className="mt-5 space-y-5">
      <TextField label="Name" name="name" defaultValue={user.name} />
      <AvatarUpload defaultAvatarUrl={user.avatarUrl} name={user.name} />
      <button className="rounded-md bg-ink px-4 py-2 text-sm font-semibold text-white hover:bg-steel">
        Save profile
      </button>
    </AccountActionForm>
  );
}

export function ChangeOwnPasswordForm() {
  return (
    <AccountActionForm action={changeOwnPasswordAction} className="mt-5 space-y-5" resetOnSuccess>
      <TextField label="Current password" name="currentPassword" type="password" />
      <TextField label="New password" name="newPassword" type="password" />
      <TextField label="Confirm new password" name="confirmPassword" type="password" />
      <button className="rounded-md bg-ink px-4 py-2 text-sm font-semibold text-white hover:bg-steel">
        Change password
      </button>
    </AccountActionForm>
  );
}
