import type {
  WeekdayPairBiasBalance,
  WeekdayPairBiasLedger
} from "@/domain/models";
import type { WeekdayPairBiasLedgerRepository } from "@/domain/repositories";
import { RepositoryConflictError } from "@/domain/repositories";

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

export class InMemoryWeekdayPairBiasLedgerRepository
  implements WeekdayPairBiasLedgerRepository
{
  private readonly entriesById = new Map<string, WeekdayPairBiasLedger>();

  constructor(seedData: ReadonlyArray<WeekdayPairBiasLedger> = []) {
    for (const entry of seedData) {
      this.assertUniqueConstraints(entry);
      this.entriesById.set(entry.id, cloneWeekdayPairBiasLedger(entry));
    }
  }

  async listByMonth(
    effectiveMonth: string
  ): Promise<ReadonlyArray<WeekdayPairBiasLedger>> {
    const entries = Array.from(this.entriesById.values()).filter(
      (entry) => entry.effectiveMonth === effectiveMonth
    );

    return sortWeekdayPairBiasLedgers(entries).map(cloneWeekdayPairBiasLedger);
  }

  async findByDoctorAndMonth(
    doctorId: string,
    effectiveMonth: string
  ): Promise<WeekdayPairBiasLedger | null> {
    const entry = Array.from(this.entriesById.values()).find(
      (candidate) =>
        candidate.doctorId === doctorId &&
        candidate.effectiveMonth === effectiveMonth
    );

    return entry ? cloneWeekdayPairBiasLedger(entry) : null;
  }

  async save(entry: WeekdayPairBiasLedger): Promise<WeekdayPairBiasLedger> {
    this.assertUniqueConstraints(entry);
    this.entriesById.set(entry.id, cloneWeekdayPairBiasLedger(entry));
    return cloneWeekdayPairBiasLedger(entry);
  }

  async saveMany(
    entries: ReadonlyArray<WeekdayPairBiasLedger>
  ): Promise<ReadonlyArray<WeekdayPairBiasLedger>> {
    const stagedEntries = new Map(this.entriesById);

    for (const entry of entries) {
      this.assertUniqueConstraints(entry, stagedEntries);
      stagedEntries.set(entry.id, cloneWeekdayPairBiasLedger(entry));
    }

    this.entriesById.clear();
    for (const [id, entry] of stagedEntries.entries()) {
      this.entriesById.set(id, entry);
    }

    return sortWeekdayPairBiasLedgers(entries).map(cloneWeekdayPairBiasLedger);
  }

  private assertUniqueConstraints(
    candidate: WeekdayPairBiasLedger,
    entriesById: ReadonlyMap<string, WeekdayPairBiasLedger> = this.entriesById
  ): void {
    for (const existingEntry of entriesById.values()) {
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

