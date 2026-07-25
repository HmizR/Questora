import { ClassStatus, UserRole, UserStatus } from "@prisma/client";

type Option = {
  value: string;
  label: string;
};

type FieldProps = {
  label: string;
  name: string;
  defaultValue?: string | null;
  maxLength?: number;
  minLength?: number;
  placeholder?: string;
  type?: string;
  required?: boolean;
};

export function TextField({
  label,
  maxLength,
  minLength,
  name,
  defaultValue,
  placeholder,
  type = "text",
  required = true
}: FieldProps) {
  const errorId = `${name}-field-error`;

  return (
    <label className="block text-sm font-medium text-ink">
      {label}
      <input
        aria-describedby={errorId}
        className="mt-2 w-full rounded-md border border-ink/15 bg-white px-3 py-2 outline-none ring-moss/40 focus:ring-4 aria-[invalid=true]:border-ember aria-[invalid=true]:ring-ember/20"
        data-field-control
        maxLength={maxLength}
        minLength={minLength}
        name={name}
        placeholder={placeholder}
        type={type}
        defaultValue={defaultValue ?? ""}
        required={required}
      />
      <span
        className="mt-1 hidden text-xs font-semibold text-ember data-[visible=true]:block"
        data-field-error-for={name}
        id={errorId}
      />
    </label>
  );
}

export function TextAreaField({
  label,
  maxLength,
  minLength,
  name,
  defaultValue,
  required = false
}: Omit<FieldProps, "type">) {
  const errorId = `${name}-field-error`;

  return (
    <label className="block text-sm font-medium text-ink">
      {label}
      <textarea
        aria-describedby={errorId}
        className="mt-2 min-h-28 w-full rounded-md border border-ink/15 bg-white px-3 py-2 outline-none ring-moss/40 focus:ring-4 aria-[invalid=true]:border-ember aria-[invalid=true]:ring-ember/20"
        data-field-control
        maxLength={maxLength}
        minLength={minLength}
        name={name}
        defaultValue={defaultValue ?? ""}
        required={required}
      />
      <span
        className="mt-1 hidden text-xs font-semibold text-ember data-[visible=true]:block"
        data-field-error-for={name}
        id={errorId}
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
  const errorId = `${name}-field-error`;

  return (
    <label className="block text-sm font-medium text-ink">
      {label}
      <select
        aria-describedby={errorId}
        className="mt-2 w-full rounded-md border border-ink/15 bg-white px-3 py-2 outline-none ring-moss/40 focus:ring-4 aria-[invalid=true]:border-ember aria-[invalid=true]:ring-ember/20"
        data-field-control
        name={name}
        defaultValue={defaultValue}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <span
        className="mt-1 hidden text-xs font-semibold text-ember data-[visible=true]:block"
        data-field-error-for={name}
        id={errorId}
      />
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
