import type {
  EntityId,
  ISODateString,
  ISODateTimeString,
  RosterStatus,
  YearMonthString
} from "@/domain/models/primitives";
import type { BiasLedger } from "@/domain/models/BiasLedger";
import type { DutyDesignAssignment } from "@/domain/models/DutyDesignAssignment";

export type RosterWizardStep = 1 | 2 | 3 | 4 | 5;
export type RosterWizardDraftStatus = RosterStatus;

export interface AssignedGroupConstraint {
  readonly date: ISODateString;
  readonly templateId: EntityId;
}

export interface DoctorExclusionPeriod {
  readonly id: EntityId;
  readonly doctorId: EntityId;
  readonly startDate: ISODateString;
  readonly endDate: ISODateString;
  readonly reason?: string;
}

export interface ManualShiftAssignment {
  readonly shiftId: EntityId;
  readonly doctorId: EntityId;
}

export interface RosterWizardDraft {
  readonly id: EntityId;
  readonly name: string;
  readonly createdByActorId: EntityId;
  readonly createdAt: ISODateTimeString;
  readonly updatedAt: ISODateTimeString;
  readonly rosterMonth: YearMonthString;
  readonly customRange?: {
    readonly startDate: ISODateString;
    readonly endDate: ISODateString;
  };
  readonly publicHolidayDates: ReadonlyArray<ISODateString>;
  readonly groupConstraintTemplateIds: ReadonlyArray<EntityId>;
  readonly groupConstraints: ReadonlyArray<AssignedGroupConstraint>;
  readonly excludedDoctorPeriods: ReadonlyArray<DoctorExclusionPeriod>;
  readonly dutyDesignAssignments: ReadonlyArray<DutyDesignAssignment>;
  readonly manualShiftAssignments: ReadonlyArray<ManualShiftAssignment>;
  readonly currentBiasSnapshot: ReadonlyArray<BiasLedger>;
  readonly status: RosterWizardDraftStatus;
  readonly currentStep: RosterWizardStep;
}
