import { ClassStatus, UserRole, UserStatus } from "@prisma/client";

type Option = {
  value: string;
  label: string;
};

type FieldProps = {
  label: string;
  name: string;
  defaultValue?: string | null;
  type?: string;
  required?: boolean;
};

export function TextField({
  label,
  name,
  defaultValue,
  type = "text",
  required = true
}: FieldProps) {
  return (
    <label className="block text-sm font-medium text-ink">
      {label}
      <input
        className="mt-2 w-full rounded-md border border-ink/15 bg-white px-3 py-2 outline-none ring-moss/40 focus:ring-4"
        name={name}
        type={type}
        defaultValue={defaultValue ?? ""}
        required={required}
      />
    </label>
  );
}

export function TextAreaField({
  label,
  name,
  defaultValue,
  required = false
}: Omit<FieldProps, "type">) {
  return (
    <label className="block text-sm font-medium text-ink">
      {label}
      <textarea
        className="mt-2 min-h-28 w-full rounded-md border border-ink/15 bg-white px-3 py-2 outline-none ring-moss/40 focus:ring-4"
        name={name}
        defaultValue={defaultValue ?? ""}
        required={required}
      />
    </label>
  );
}

export function SelectField({
  label,
  name,
  defaultValue,
  options
}: {
  label: string;
  name: string;
  defaultValue?: string;
  options: Option[];
}) {
  return (
    <label className="block text-sm font-medium text-ink">
      {label}
      <select
        className="mt-2 w-full rounded-md border border-ink/15 bg-white px-3 py-2 outline-none ring-moss/40 focus:ring-4"
        name={name}
        defaultValue={defaultValue}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export const roleOptions = Object.values(UserRole).map((role) => ({ value: role, label: role }));
export const userStatusOptions = Object.values(UserStatus).map((status) => ({
  value: status,
  label: status
}));
export const classStatusOptions = Object.values(ClassStatus).map((status) => ({
  value: status,
  label: status
}));
