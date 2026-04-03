export interface DutyLocationFieldErrors {
  code?: string;
  label?: string;
  description?: string;
}

export class DutyLocationValidationError extends Error {
  readonly fieldErrors: DutyLocationFieldErrors;

  constructor(fieldErrors: DutyLocationFieldErrors) {
    super("Duty location validation failed.");
    this.name = "DutyLocationValidationError";
    this.fieldErrors = fieldErrors;
  }
}

export interface NormalizedDutyLocationInput {
  readonly code: string;
  readonly label: string;
  readonly description?: string;
}

function normalizeOptionalDescription(description?: string): string | undefined {
  const normalized = description?.trim() ?? "";
  return normalized.length > 0 ? normalized : undefined;
}

export function validateDutyLocationInput(input: {
  readonly code: string;
  readonly label: string;
  readonly description?: string;
}): NormalizedDutyLocationInput {
  const code = input.code.trim().toUpperCase();
  const label = input.label.trim();
  const description = normalizeOptionalDescription(input.description);
  const fieldErrors: DutyLocationFieldErrors = {};

  if (code.length === 0) {
    fieldErrors.code = "Code is required.";
  } else if (code.length > 20) {
    fieldErrors.code = "Code must be 1-20 characters.";
  } else if (!/^[A-Z0-9_]+$/.test(code)) {
    fieldErrors.code = "Code must contain only uppercase letters, numbers, or underscores.";
  }

  if (label.length === 0) {
    fieldErrors.label = "Label is required.";
  } else if (label.length > 100) {
    fieldErrors.label = "Label must be 1-100 characters.";
  }

  if (description !== undefined && description.length > 500) {
    fieldErrors.description = "Description must be 500 characters or fewer.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    throw new DutyLocationValidationError(fieldErrors);
  }

  return {
    code,
    label,
    description
  };
}
