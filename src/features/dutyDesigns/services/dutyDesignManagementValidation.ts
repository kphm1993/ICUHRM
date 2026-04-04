import type { EntityId } from "@/domain/models";

export interface DutyDesignBlockInput {
  readonly shiftTypeId: EntityId;
  readonly locationId?: EntityId;
  readonly doctorCount: number;
  readonly offOffsetDays?: number;
  readonly followUpDutyDesignId?: EntityId;
}

export interface DutyDesignValidationErrors {
  code?: string;
  label?: string;
  dutyBlocks?: string;
}

export class DutyDesignValidationError extends Error {
  readonly fieldErrors: DutyDesignValidationErrors;

  constructor(fieldErrors: DutyDesignValidationErrors) {
    super("Duty design validation failed.");
    this.name = "DutyDesignValidationError";
    this.fieldErrors = fieldErrors;
  }
}

export interface NormalizedDutyDesignInput {
  readonly code: string;
  readonly label: string;
  readonly description?: string;
  readonly isActive: boolean;
  readonly isHolidayDesign: boolean;
  readonly dutyBlocks: ReadonlyArray<DutyDesignBlockInput>;
}

export function validateDutyDesignInput(input: {
  readonly code: string;
  readonly label: string;
  readonly description?: string;
  readonly isActive: boolean;
  readonly isHolidayDesign: boolean;
  readonly dutyBlocks: ReadonlyArray<DutyDesignBlockInput>;
}): NormalizedDutyDesignInput {
  const code = input.code.trim().toUpperCase();
  const label = input.label.trim();
  const description = input.description?.trim() || undefined;
  const fieldErrors: DutyDesignValidationErrors = {};

  if (code.length === 0) {
    fieldErrors.code = "Code is required.";
  }

  if (label.length === 0) {
    fieldErrors.label = "Label is required.";
  }

  if (input.dutyBlocks.length === 0) {
    fieldErrors.dutyBlocks = "At least one duty block is required.";
  } else if (
    input.dutyBlocks.some(
      (block) =>
        block.shiftTypeId.trim().length === 0 ||
        !Number.isInteger(block.doctorCount) ||
        block.doctorCount <= 0 ||
        (block.offOffsetDays !== undefined &&
          (!Number.isInteger(block.offOffsetDays) ||
            block.offOffsetDays < 0 ||
            block.offOffsetDays > 7))
    )
  ) {
    fieldErrors.dutyBlocks =
      "Every duty block requires a shift type, a positive doctor count, and optional off-offset days between 0 and 7.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    throw new DutyDesignValidationError(fieldErrors);
  }

  return {
    code,
    label,
    description,
    isActive: input.isActive,
    isHolidayDesign: input.isHolidayDesign,
    dutyBlocks: input.dutyBlocks.map((block) => ({
      shiftTypeId: block.shiftTypeId,
      locationId: block.locationId || undefined,
      doctorCount: block.doctorCount,
      offOffsetDays: block.offOffsetDays,
      followUpDutyDesignId: block.followUpDutyDesignId || undefined
    }))
  };
}
