import type {
  Assignment,
  BiasLedger,
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
    balance: { ...entry.balance }
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
    weekendGroupSchedule: summary.weekendGroupSchedule.map((entry) => ({ ...entry }))
  };
}

function cloneRosterSnapshot(snapshot: RosterSnapshot): RosterSnapshot {
  return {
    ...snapshot,
    roster: {
      ...snapshot.roster,
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
    return readCollectionFromStorage(this.storageKey, this.seedData).map(
      cloneRosterSnapshot
    );
  }

  private writeEntries(entries: ReadonlyArray<RosterSnapshot>): void {
    writeCollectionToStorage(
      this.storageKey,
      sortRosterSnapshots(entries).map(cloneRosterSnapshot)
    );
  }
}
