import type { BiasLedger, BiasLedgerBalances } from "@/domain/models";
import type { BiasLedgerRepository } from "@/domain/repositories";
import { RepositoryConflictError } from "@/domain/repositories";

function cloneBiasBalances(balances: BiasLedgerBalances): BiasLedgerBalances {
  return { ...balances };
}

function cloneBiasLedger(entry: BiasLedger): BiasLedger {
  return {
    ...entry,
    balances: cloneBiasBalances(entry.balances)
  };
}

function sortBiasLedgers(
  entries: ReadonlyArray<BiasLedger>
): ReadonlyArray<BiasLedger> {
  return [...entries].sort((left, right) => {
    const monthComparison = left.effectiveMonth.localeCompare(right.effectiveMonth);
    return monthComparison !== 0
      ? monthComparison
      : left.doctorId.localeCompare(right.doctorId);
  });
}

export class InMemoryBiasLedgerRepository implements BiasLedgerRepository {
  private readonly entriesById = new Map<string, BiasLedger>();

  constructor(seedData: ReadonlyArray<BiasLedger> = []) {
    for (const entry of seedData) {
      this.assertUniqueConstraints(entry);
      this.entriesById.set(entry.id, cloneBiasLedger(entry));
    }
  }

  async listByMonth(effectiveMonth: string): Promise<ReadonlyArray<BiasLedger>> {
    const entries = Array.from(this.entriesById.values()).filter(
      (entry) => entry.effectiveMonth === effectiveMonth
    );

    return sortBiasLedgers(entries).map(cloneBiasLedger);
  }

  async listByDoctor(doctorId: string): Promise<ReadonlyArray<BiasLedger>> {
    const entries = Array.from(this.entriesById.values()).filter(
      (entry) => entry.doctorId === doctorId
    );

    return sortBiasLedgers(entries).map(cloneBiasLedger);
  }

  async hasAnyBalanceForCriteria(criteriaId: string): Promise<boolean> {
    return Array.from(this.entriesById.values()).some((entry) =>
      Object.prototype.hasOwnProperty.call(entry.balances, criteriaId)
    );
  }

  async findByDoctorAndMonth(
    doctorId: string,
    effectiveMonth: string
  ): Promise<BiasLedger | null> {
    const entry = Array.from(this.entriesById.values()).find(
      (candidate) =>
        candidate.doctorId === doctorId &&
        candidate.effectiveMonth === effectiveMonth
    );

    return entry ? cloneBiasLedger(entry) : null;
  }

  async save(entry: BiasLedger): Promise<BiasLedger> {
    this.assertUniqueConstraints(entry);
    this.entriesById.set(entry.id, cloneBiasLedger(entry));
    return cloneBiasLedger(entry);
  }

  async saveMany(
    entries: ReadonlyArray<BiasLedger>
  ): Promise<ReadonlyArray<BiasLedger>> {
    const stagedEntries = new Map(this.entriesById);

    for (const entry of entries) {
      this.assertUniqueConstraints(entry, stagedEntries);
      stagedEntries.set(entry.id, cloneBiasLedger(entry));
    }

    this.entriesById.clear();
    for (const [id, entry] of stagedEntries.entries()) {
      this.entriesById.set(id, entry);
    }

    return sortBiasLedgers(entries).map(cloneBiasLedger);
  }

  private assertUniqueConstraints(
    candidate: BiasLedger,
    entriesById: ReadonlyMap<string, BiasLedger> = this.entriesById
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
          `Bias ledger already exists for doctor '${candidate.doctorId}' and month '${candidate.effectiveMonth}'.`
        );
      }
    }
  }
}
