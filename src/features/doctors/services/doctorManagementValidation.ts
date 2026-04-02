import type { WeekendGroup } from "@/domain/models";

export class DoctorValidationError extends Error {
  readonly code = "VALIDATION_ERROR" as const;

  constructor(message: string) {
    super(message);
    this.name = "DoctorValidationError";
  }
}

export interface NormalizedDoctorInput {
  readonly name: string;
  readonly phoneNumber: string;
  readonly uniqueIdentifier: string;
  readonly weekendGroup: WeekendGroup;
  readonly temporaryPassword: string;
}

function normalizeRequiredText(value: string, label: string): string {
  const normalizedValue = value.trim();

  if (!normalizedValue) {
    throw new DoctorValidationError(`${label} is required.`);
  }

  return normalizedValue;
}

function normalizeWeekendGroup(value: WeekendGroup): WeekendGroup {
  if (value !== "A" && value !== "B") {
    throw new DoctorValidationError("Weekend group must be either A or B.");
  }

  return value;
}

function normalizeTemporaryPassword(
  value: string,
  options: { readonly required: boolean }
): string {
  const normalizedValue = value.trim();

  if (options.required && !normalizedValue) {
    throw new DoctorValidationError(
      "Temporary password placeholder is required for doctor setup."
    );
  }

  return normalizedValue;
}

export function validateCreateDoctorInput(input: {
  readonly name: string;
  readonly phoneNumber: string;
  readonly uniqueIdentifier: string;
  readonly weekendGroup: WeekendGroup;
  readonly temporaryPassword: string;
}): NormalizedDoctorInput {
  return {
    name: normalizeRequiredText(input.name, "Full name"),
    phoneNumber: normalizeRequiredText(input.phoneNumber, "Phone number"),
    uniqueIdentifier: normalizeRequiredText(
      input.uniqueIdentifier,
      "Unique ID / employee ID"
    ),
    weekendGroup: normalizeWeekendGroup(input.weekendGroup),
    temporaryPassword: normalizeTemporaryPassword(input.temporaryPassword, {
      required: true
    })
  };
}

export function validateUpdateDoctorInput(input: {
  readonly name: string;
  readonly phoneNumber: string;
  readonly uniqueIdentifier: string;
  readonly weekendGroup: WeekendGroup;
  readonly temporaryPassword?: string;
}): NormalizedDoctorInput {
  return {
    name: normalizeRequiredText(input.name, "Full name"),
    phoneNumber: normalizeRequiredText(input.phoneNumber, "Phone number"),
    uniqueIdentifier: normalizeRequiredText(
      input.uniqueIdentifier,
      "Unique ID / employee ID"
    ),
    weekendGroup: normalizeWeekendGroup(input.weekendGroup),
    temporaryPassword: normalizeTemporaryPassword(input.temporaryPassword ?? "", {
      required: false
    })
  };
}
