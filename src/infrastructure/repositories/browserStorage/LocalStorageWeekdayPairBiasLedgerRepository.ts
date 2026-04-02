import type {
  WeekdayPairBiasBalance,
  WeekdayPairBiasLedger
} from "@/domain/models";
import type { WeekdayPairBiasLedgerRepository } from "@/domain/repositories";
import { RepositoryConflictError } from "@/domain/repositories";
import type { BrowserStorageRepositoryOptions } from "@/infrastructure/repositories/browserStorage/storage";
import {
  readCollectionFromStorage,
  STORAGE_KEYS,
  writeCollectionToStorage
} from "@/infrastructure/repositories/browserStorage/storage";

function cloneWeekdayPairBiasBalance(
  balance: WeekdayPairBiasBalance
): WeekdayPairBiasBalance {
  return { ...balance };
}

function cloneWeekdayPairBiasLedger(
  entry: WeekdayPairBiasLedger
): WeekdayPairBiasLedger {
  return {
    ...entry,
    balance: cloneWeekdayPairBiasBalance(entry.balance)
  };
}

function sortWeekdayPairBiasLedgers(
  entries: ReadonlyArray<WeekdayPairBiasLedger>
): ReadonlyArray<WeekdayPairBiasLedger> {
  return [...entries].sort((left, right) => {
    const monthComparison = left.effectiveMonth.localeCompare(right.effectiveMonth);
    return monthComparison !== 0
      ? monthComparison
      : left.doctorId.localeCompare(right.doctorId);
  });
}

export class LocalStorageWeekdayPairBiasLedgerRepository
  implements WeekdayPairBiasLedgerRepository
{
  private readonly storageKey: string;
  private readonly seedData: ReadonlyArray<WeekdayPairBiasLedger>;

  constructor(options: BrowserStorageRepositoryOptions<WeekdayPairBiasLedger> = {}) {
    this.storageKey =
      options.storageKey ?? STORAGE_KEYS.weekdayPairBiasLedgers;
    this.seedData = options.seedData ?? [];
  }

  async listByMonth(
    effectiveMonth: string
  ): Promise<ReadonlyArray<WeekdayPairBiasLedger>> {
    const entries = this.readEntries().filter(
      (entry) => entry.effectiveMonth === effectiveMonth
    );

    return sortWeekdayPairBiasLedgers(entries).map(cloneWeekdayPairBiasLedger);
  }

  async listByDoctor(
    doctorId: string
  ): Promise<ReadonlyArray<WeekdayPairBiasLedger>> {
    const entries = this.readEntries().filter(
      (entry) => entry.doctorId === doctorId
    );

    return sortWeekdayPairBiasLedgers(entries).map(cloneWeekdayPairBiasLedger);
  }

  async findByDoctorAndMonth(
    doctorId: string,
    effectiveMonth: string
  ): Promise<WeekdayPairBiasLedger | null> {
    const entry = this.readEntries().find(
      (candidate) =>
        candidate.doctorId === doctorId &&
        candidate.effectiveMonth === effectiveMonth
    );

    return entry ? cloneWeekdayPairBiasLedger(entry) : null;
  }

  async save(
    entry: WeekdayPairBiasLedger
  ): Promise<WeekdayPairBiasLedger> {
    const entries = this.readEntries();
    this.assertUniqueConstraints(entry, entries);

    const nextEntries = entries.filter((candidate) => candidate.id !== entry.id);
    nextEntries.push(cloneWeekdayPairBiasLedger(entry));
    this.writeEntries(nextEntries);

    return cloneWeekdayPairBiasLedger(entry);
  }

  async saveMany(
    entries: ReadonlyArray<WeekdayPairBiasLedger>
  ): Promise<ReadonlyArray<WeekdayPairBiasLedger>> {
    const currentEntries = this.readEntries();
    const stagedEntries = currentEntries.filter(
      (currentEntry) =>
        !entries.some((candidate) => candidate.id === currentEntry.id)
    );

    for (const entry of entries) {
      this.assertUniqueConstraints(entry, [...stagedEntries, ...entries]);
    }

    const nextEntries = [...stagedEntries, ...entries.map(cloneWeekdayPairBiasLedger)];
    this.writeEntries(nextEntries);

    return sortWeekdayPairBiasLedgers(entries).map(cloneWeekdayPairBiasLedger);
  }

  private readEntries(): WeekdayPairBiasLedger[] {
    return readCollectionFromStorage(this.storageKey, this.seedData).map(
      cloneWeekdayPairBiasLedger
    );
  }

  private writeEntries(entries: ReadonlyArray<WeekdayPairBiasLedger>): void {
    writeCollectionToStorage(
      this.storageKey,
      sortWeekdayPairBiasLedgers(entries).map(cloneWeekdayPairBiasLedger)
    );
  }

  private assertUniqueConstraints(
    candidate: WeekdayPairBiasLedger,
    entries: ReadonlyArray<WeekdayPairBiasLedger>
  ): void {
    for (const existingEntry of entries) {
      if (existingEntry.id === candidate.id) {
        continue;
      }

      if (
        existingEntry.doctorId === candidate.doctorId &&
        existingEntry.effectiveMonth === candidate.effectiveMonth
      ) {
        throw new RepositoryConflictError(
          `Weekday pair bias ledger already exists for doctor '${candidate.doctorId}' and month '${candidate.effectiveMonth}'.`
        );
      }
    }
  }
}
