import type {
  Assignment,
  BiasCriteria,
  BiasLedger,
  DutyDesign,
  DutyDesignAssignment,
  DutyDesignAssignmentsSnapshot,
  DutyDesignAssignmentSnapshotEntry,
  DutyDesignSnapshot,
  DutyLocation,
  GeneratedRosterInputSummary,
  RosterSnapshot,
  RosterSnapshotDoctorReference,
  Shift,
  WeekdayPairBiasLedger
} from "@/domain/models";
import { DEFAULT_DUTY_LOCATION_ID } from "@/domain/models";
import type {
  RosterSnapshotRepository,
  RosterSnapshotRepositoryFilter
} from "@/domain/repositories";
import type { ValidationResult } from "@/domain/scheduling/contracts";
import type { BrowserStorageRepositoryOptions } from "@/infrastructure/repositories/browserStorage/storage";
import {
  readCollectionFromStorage,
  STORAGE_KEYS,
  writeCollectionToStorage
} from "@/infrastructure/repositories/browserStorage/storage";

function cloneShift(shift: Shift): Shift {
  return {
    ...shift,
    definitionSnapshot: { ...shift.definitionSnapshot }
  };
}

function cloneDutyDesign(design: DutyDesign): DutyDesign {
  return {
    ...design,
    dutyBlocks: design.dutyBlocks.map((block) => ({ ...block }))
  };
}

function cloneDutyDesignAssignmentSnapshotEntry(
  entry: DutyDesignAssignmentSnapshotEntry
): DutyDesignAssignmentSnapshotEntry {
  return {
    standardDesignId: entry.standardDesignId,
    holidayOverrideDesignId: entry.holidayOverrideDesignId
  };
}

function cloneDutyDesignAssignmentsSnapshot(
  assignments: DutyDesignAssignmentsSnapshot
): DutyDesignAssignmentsSnapshot {
  return Object.fromEntries(
    Object.entries(assignments).map(([date, entry]) => [
      date,
      cloneDutyDesignAssignmentSnapshotEntry(entry)
    ])
  );
}

function cloneDutyDesignSnapshot(
  dutyDesignSnapshot: DutyDesignSnapshot
): DutyDesignSnapshot {
  return Object.fromEntries(
    Object.entries(dutyDesignSnapshot).map(([designId, dutyDesign]) => [
      designId,
      cloneDutyDesign(dutyDesign)
    ])
  );
}

function cloneAssignment(assignment: Assignment): Assignment {
  return { ...assignment };
}

function cloneDoctorReference(
  reference: RosterSnapshotDoctorReference
): RosterSnapshotDoctorReference {
  return {
    ...reference,
    groupId: reference.groupId,
    groupName: reference.groupName,
    weekendGroup: reference.weekendGroup
  };
}

function cloneBiasLedger(entry: BiasLedger): BiasLedger {
  return {
    ...entry,
    balances: { ...entry.balances }
  };
}

function normalizeBiasLedger(
  entry: BiasLedger & { balance?: BiasLedger["balances"] }
): BiasLedger {
  return {
    ...entry,
    balances: { ...(entry.balances ?? entry.balance ?? {}) }
  };
}

function cloneWeekdayPairBiasLedger(
  entry: WeekdayPairBiasLedger
): WeekdayPairBiasLedger {
  return {
    ...entry,
    balance: { ...entry.balance }
  };
}

function cloneValidation(validation: ValidationResult): ValidationResult {
  return {
    isValid: validation.isValid,
    issues: validation.issues.map((issue) => ({ ...issue }))
  };
}

function normalizeBiasCriteria(criteria: BiasCriteria): BiasCriteria {
  return {
    ...criteria,
    isLocked: criteria.isLocked ?? false,
    lockedAt: criteria.lockedAt,
    lockedByActorId: criteria.lockedByActorId,
    locationIds: [...criteria.locationIds],
    shiftTypeIds: [...criteria.shiftTypeIds],
    weekdayConditions: [...criteria.weekdayConditions]
  };
}

function buildDutyDesignAssignmentsSnapshot(
  assignments: ReadonlyArray<DutyDesignAssignment>
): DutyDesignAssignmentsSnapshot {
  const snapshot: Record<string, DutyDesignAssignmentSnapshotEntry> = {};

  assignments.forEach((assignment) => {
    const existingEntry = snapshot[assignment.date];
    snapshot[assignment.date] = assignment.isHolidayOverride
      ? {
          standardDesignId: existingEntry?.standardDesignId,
          holidayOverrideDesignId: assignment.dutyDesignId
        }
      : {
          standardDesignId: assignment.dutyDesignId,
          holidayOverrideDesignId: existingEntry?.holidayOverrideDesignId
        };
  });

  return snapshot;
}

function normalizeDutyDesignAssignments(
  assignments:
    | GeneratedRosterInputSummary["dutyDesignAssignments"]
    | ReadonlyArray<DutyDesignAssignment>
    | undefined
): DutyDesignAssignmentsSnapshot {
  if (!assignments) {
    return {};
  }

  if (Array.isArray(assignments)) {
    return buildDutyDesignAssignmentsSnapshot(assignments);
  }

  return cloneDutyDesignAssignmentsSnapshot(
    assignments as GeneratedRosterInputSummary["dutyDesignAssignments"]
  );
}

function normalizeDutyDesignSnapshot(
  dutyDesignSnapshot:
    | GeneratedRosterInputSummary["dutyDesignSnapshot"]
    | undefined,
  selectedDutyDesigns?: ReadonlyArray<DutyDesign>
): DutyDesignSnapshot {
  if (dutyDesignSnapshot) {
    return cloneDutyDesignSnapshot(dutyDesignSnapshot);
  }

  return Object.fromEntries(
    (selectedDutyDesigns ?? []).map((dutyDesign) => [dutyDesign.id, cloneDutyDesign(dutyDesign)])
  );
}

function cloneGeneratedInputSummary(
  summary: GeneratedRosterInputSummary
): GeneratedRosterInputSummary {
  return {
    ...summary,
    range: { ...summary.range },
    firstWeekendOffGroup: summary.firstWeekendOffGroup,
    weekendGroupSchedule: summary.weekendGroupSchedule?.map((entry) => ({ ...entry })),
    activeBiasCriteria: (summary.activeBiasCriteria ?? []).map(normalizeBiasCriteria),
    activeDutyLocations: (summary.activeDutyLocations ?? []).map((location) => ({
      ...location
    })),
    doctorGroupSnapshot: Object.fromEntries(
      Object.entries(summary.doctorGroupSnapshot ?? {}).map(([groupId, group]) => [
        groupId,
        { ...group }
      ])
    ),
    allowedDoctorGroupIdByDate: Object.fromEntries(
      Object.entries(summary.allowedDoctorGroupIdByDate ?? {})
    ),
    dutyDesignAssignments: cloneDutyDesignAssignmentsSnapshot(
      summary.dutyDesignAssignments ?? {}
    ),
    dutyDesignSnapshot: cloneDutyDesignSnapshot(summary.dutyDesignSnapshot ?? {}),
    publicHolidayDates: [...(summary.publicHolidayDates ?? [])],
    fallbackLocationId: summary.fallbackLocationId ?? DEFAULT_DUTY_LOCATION_ID
  };
}

function cloneRosterSnapshot(snapshot: RosterSnapshot): RosterSnapshot {
  return {
    ...snapshot,
    roster: {
      ...snapshot.roster,
      isDeleted: snapshot.roster.isDeleted,
      deletedAt: snapshot.roster.deletedAt,
      deletedByActorId: snapshot.roster.deletedByActorId,
      period: { ...snapshot.roster.period },
      weekendGroupSchedule: snapshot.roster.weekendGroupSchedule?.map((entry) => ({
        ...entry
      }))
    },
    doctorReferences: (snapshot.doctorReferences ?? []).map(cloneDoctorReference),
    shifts: snapshot.shifts.map(cloneShift),
    assignments: snapshot.assignments.map(cloneAssignment),
    warnings: [...snapshot.warnings],
    validation: cloneValidation(snapshot.validation),
    updatedBias: snapshot.updatedBias.map(cloneBiasLedger),
    updatedWeekdayPairBias: snapshot.updatedWeekdayPairBias?.map(
      cloneWeekdayPairBiasLedger
    ),
    generatedInputSummary: cloneGeneratedInputSummary(snapshot.generatedInputSummary)
  };
}

function normalizeGeneratedInputSummary(
  summary: GeneratedRosterInputSummary & {
    activeBiasCriteria?: ReadonlyArray<BiasCriteria>;
    activeDutyLocations?: ReadonlyArray<DutyLocation>;
    selectedDutyDesigns?: ReadonlyArray<DutyDesign>;
    dutyDesignAssignments?:
      | GeneratedRosterInputSummary["dutyDesignAssignments"]
      | ReadonlyArray<DutyDesignAssignment>;
    dutyDesignSnapshot?: GeneratedRosterInputSummary["dutyDesignSnapshot"];
  }
): GeneratedRosterInputSummary {
  return {
    ...summary,
    firstWeekendOffGroup: summary.firstWeekendOffGroup,
    weekendGroupSchedule: summary.weekendGroupSchedule?.map((entry) => ({
      ...entry
    })),
    activeBiasCriteria: (summary.activeBiasCriteria ?? []).map(normalizeBiasCriteria),
    activeDutyLocations: (summary.activeDutyLocations ?? []).map((location) => ({
      ...location
    })),
    doctorGroupSnapshot: Object.fromEntries(
      Object.entries(summary.doctorGroupSnapshot ?? {}).map(([groupId, group]) => [
        groupId,
        { ...group }
      ])
    ),
    allowedDoctorGroupIdByDate: Object.fromEntries(
      Object.entries(summary.allowedDoctorGroupIdByDate ?? {})
    ),
    dutyDesignAssignments: normalizeDutyDesignAssignments(summary.dutyDesignAssignments),
    dutyDesignSnapshot: normalizeDutyDesignSnapshot(
      summary.dutyDesignSnapshot,
      summary.selectedDutyDesigns
    ),
    publicHolidayDates: [...(summary.publicHolidayDates ?? [])],
    fallbackLocationId: summary.fallbackLocationId ?? DEFAULT_DUTY_LOCATION_ID
  };
}

function sortRosterSnapshots(
  snapshots: ReadonlyArray<RosterSnapshot>
): ReadonlyArray<RosterSnapshot> {
  return [...snapshots].sort((left, right) => {
    const monthComparison = left.generatedInputSummary.rosterMonth.localeCompare(
      right.generatedInputSummary.rosterMonth
    );
    if (monthComparison !== 0) {
      return monthComparison;
    }

    const createdAtComparison = right.roster.createdAt.localeCompare(
      left.roster.createdAt
    );
    return createdAtComparison !== 0
      ? createdAtComparison
      : right.roster.id.localeCompare(left.roster.id);
  });
}

export class LocalStorageRosterSnapshotRepository
  implements RosterSnapshotRepository
{
  private readonly storageKey: string;
  private readonly seedData: ReadonlyArray<RosterSnapshot>;

  constructor(options: BrowserStorageRepositoryOptions<RosterSnapshot> = {}) {
    this.storageKey = options.storageKey ?? STORAGE_KEYS.rosterSnapshots;
    this.seedData = options.seedData ?? [];
  }

  async list(
    filter?: RosterSnapshotRepositoryFilter
  ): Promise<ReadonlyArray<RosterSnapshot>> {
    const snapshots = this.readEntries().filter((snapshot) => {
      if (
        filter?.rosterMonth !== undefined &&
        snapshot.generatedInputSummary.rosterMonth !== filter.rosterMonth
      ) {
        return false;
      }

      if (
        filter?.statuses !== undefined &&
        !filter.statuses.includes(snapshot.roster.status)
      ) {
        return false;
      }

      return true;
    });

    return sortRosterSnapshots(snapshots).map(cloneRosterSnapshot);
  }

  async findById(id: string): Promise<RosterSnapshot | null> {
    const snapshot = this.readEntries().find((entry) => entry.roster.id === id);
    return snapshot ? cloneRosterSnapshot(snapshot) : null;
  }

  async save(snapshot: RosterSnapshot): Promise<RosterSnapshot> {
    const entries = this.readEntries().filter(
      (entry) => entry.roster.id !== snapshot.roster.id
    );
    entries.push(cloneRosterSnapshot(snapshot));
    this.writeEntries(entries);
    return cloneRosterSnapshot(snapshot);
  }

  private readEntries(): RosterSnapshot[] {
    return readCollectionFromStorage(this.storageKey, this.seedData).map((snapshot) =>
      cloneRosterSnapshot({
        ...snapshot,
        roster: {
          ...snapshot.roster,
          isDeleted: snapshot.roster.isDeleted ?? false,
          deletedAt: snapshot.roster.deletedAt,
          deletedByActorId: snapshot.roster.deletedByActorId
        },
        updatedBias: snapshot.updatedBias.map((entry) =>
          normalizeBiasLedger(
            entry as BiasLedger & { balance?: BiasLedger["balances"] }
          )
        ),
        generatedInputSummary: normalizeGeneratedInputSummary(
          snapshot.generatedInputSummary as GeneratedRosterInputSummary & {
            activeBiasCriteria?: ReadonlyArray<BiasCriteria>;
            activeDutyLocations?: ReadonlyArray<DutyLocation>;
          }
        )
      } as RosterSnapshot)
    );
  }

  private writeEntries(entries: ReadonlyArray<RosterSnapshot>): void {
    writeCollectionToStorage(
      this.storageKey,
      sortRosterSnapshots(entries).map(cloneRosterSnapshot)
    );
  }
}
