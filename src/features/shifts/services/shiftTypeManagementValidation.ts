import type { ShiftKind, TimeOfDayString } from "@/domain/models";

export interface ShiftTypeFieldErrors {
  code?: string;
  label?: string;
  startTime?: string;
  endTime?: string;
}

export class ShiftTypeValidationError extends Error {
  readonly fieldErrors: ShiftTypeFieldErrors;

  constructor(fieldErrors: ShiftTypeFieldErrors) {
    super("Shift type validation failed.");
    this.name = "ShiftTypeValidationError";
    this.fieldErrors = fieldErrors;
  }
}

export interface NormalizedShiftTypeInput {
  readonly code: string;
  readonly label: string;
  readonly startTime: TimeOfDayString;
  readonly endTime: TimeOfDayString;
  readonly category: ShiftKind;
}

export function validateShiftTypeInput(input: {
  readonly code: string;
  readonly label: string;
  readonly startTime: TimeOfDayString;
  readonly endTime: TimeOfDayString;
  readonly category: ShiftKind;
}): NormalizedShiftTypeInput {
  const code = input.code.trim().toUpperCase();
  const label = input.label.trim();
  const startTime = input.startTime.trim() as TimeOfDayString;
  const endTime = input.endTime.trim() as TimeOfDayString;
  const fieldErrors: ShiftTypeFieldErrors = {};

  if (code.length === 0) {
    fieldErrors.code = "Code is required.";
  }

  if (label.length === 0) {
    fieldErrors.label = "Label is required.";
  }

  if (startTime.length === 0) {
    fieldErrors.startTime = "Start time is required.";
  }

  if (endTime.length === 0) {
    fieldErrors.endTime = "End time is required.";
  } else if (startTime.length > 0 && startTime === endTime) {
    fieldErrors.endTime = "Start time and end time must be different.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    throw new ShiftTypeValidationError(fieldErrors);
  }

  return {
    code,
    label,
    startTime,
    endTime,
    category: input.category
  };
}
