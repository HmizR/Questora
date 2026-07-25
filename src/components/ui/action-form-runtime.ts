import type { ActionResult } from "@/lib/errors";

type FieldElement = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
type MessageResult = ActionResult<{ message: string }>;

function getNamedField(form: HTMLFormElement, name: string) {
  const element = form.elements.namedItem(name);
  if (
    element instanceof HTMLInputElement ||
    element instanceof HTMLSelectElement ||
    element instanceof HTMLTextAreaElement
  ) {
    return element;
  }

  return null;
}

function setFieldError(form: HTMLFormElement, field: FieldElement, message: string) {
  field.setAttribute("aria-invalid", message ? "true" : "false");

  const errorNode = form.querySelector<HTMLElement>(
    `[data-field-error-for="${CSS.escape(field.name)}"]`
  );
  if (!errorNode) {
    return;
  }

  errorNode.textContent = message;
  errorNode.dataset.visible = message ? "true" : "false";
}

export function showNativeFieldError(form: HTMLFormElement, field: FieldElement) {
  if (!field.name || field.type === "hidden") {
    return;
  }

  setFieldError(form, field, field.validity.valid ? "" : field.validationMessage);
}

export function clearFormFieldErrors(form: HTMLFormElement) {
  form.querySelectorAll<FieldElement>("[data-field-control]").forEach((field) => {
    setFieldError(form, field, "");
  });
}

export function applyServerFieldErrors(form: HTMLFormElement, state: MessageResult) {
  clearFormFieldErrors(form);

  if (state.ok || !state.error.fieldErrors) {
    return;
  }

  Object.entries(state.error.fieldErrors).forEach(([name, messages]) => {
    const field = getNamedField(form, name);
    if (!field) {
      return;
    }

    setFieldError(form, field, messages[0] ?? "");
  });
}

export function restoreSubmittedValues(form: HTMLFormElement, formData: FormData) {
  const valuesByName = new Map<string, FormDataEntryValue[]>();
  formData.forEach((value, name) => {
    const values = valuesByName.get(name) ?? [];
    values.push(value);
    valuesByName.set(name, values);
  });

  form.querySelectorAll<FieldElement>("[name]").forEach((field) => {
    const values = valuesByName.get(field.name);
    if (!values) {
      if (field instanceof HTMLInputElement && field.type === "checkbox") {
        field.checked = false;
      }
      return;
    }

    if (field instanceof HTMLInputElement && field.type === "checkbox") {
      field.checked = values.some((value) => value === field.value || value === "on");
      return;
    }

    if (field instanceof HTMLInputElement && field.type === "radio") {
      field.checked = values.some((value) => value === field.value);
      return;
    }

    field.value = String(values[0] ?? "");
  });
}
