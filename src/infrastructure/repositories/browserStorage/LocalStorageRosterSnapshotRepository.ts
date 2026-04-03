import type {
  Assignment,
  BiasCriteria,
  BiasLedger,
  DutyLocation,
  GeneratedRosterInputSummary,
  RosterSnapshotDoctorReference,
  RosterSnapshot,
  Shift,
  WeekdayPairBiasLedger
} from "@/domain/models";
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

function cloneAssignment(assignment: Assignment): Assignment {
  return { ...assignment };
}

function cloneDoctorReference(
  reference: RosterSnapshotDoctorReference
): RosterSnapshotDoctorReference {
  return { ...reference };
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

function cloneGeneratedInputSummary(
  summary: GeneratedRosterInputSummary
): GeneratedRosterInputSummary {
  return {
    ...summary,
    range: { ...summary.range },
    weekendGroupSchedule: summary.weekendGroupSchedule.map((entry) => ({ ...entry })),
    activeBiasCriteria: (summary.activeBiasCriteria ?? []).map((criteria) => ({
      ...criteria,
      locationIds: [...criteria.locationIds],
      shiftTypeIds: [...criteria.shiftTypeIds],
      weekdayConditions: [...criteria.weekdayConditions]
    })),
    activeDutyLocations: (summary.activeDutyLocations ?? []).map((location) => ({
      ...location
    }))
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
      weekendGroupSchedule: snapshot.roster.weekendGroupSchedule.map((entry) => ({
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
  }
): GeneratedRosterInputSummary {
  return {
    ...summary,
    activeBiasCriteria: (summary.activeBiasCriteria ?? []).map((criteria) => ({
      ...criteria,
      locationIds: [...criteria.locationIds],
      shiftTypeIds: [...criteria.shiftTypeIds],
      weekdayConditions: [...criteria.weekdayConditions]
    })),
    activeDutyLocations: (summary.activeDutyLocations ?? []).map((location) => ({
      ...location
    }))
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
