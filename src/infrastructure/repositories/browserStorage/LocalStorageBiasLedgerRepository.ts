import type { BiasLedger, BiasLedgerBalances } from "@/domain/models";
import type { BiasLedgerRepository } from "@/domain/repositories";
import { RepositoryConflictError } from "@/domain/repositories";
import type { BrowserStorageRepositoryOptions } from "@/infrastructure/repositories/browserStorage/storage";
import {
  readCollectionFromStorage,
  STORAGE_KEYS,
  writeCollectionToStorage
} from "@/infrastructure/repositories/browserStorage/storage";

function cloneBiasBalances(balances: BiasLedgerBalances): BiasLedgerBalances {
  return { ...balances };
}

function normalizeBiasLedger(entry: BiasLedger & { balance?: BiasLedgerBalances }): BiasLedger {
  return {
    ...entry,
    balances: cloneBiasBalances(entry.balances ?? entry.balance ?? {})
  };
}

function cloneBiasLedger(entry: BiasLedger): BiasLedger {
  return normalizeBiasLedger(entry);
}

function sortBiasLedgers(entries: ReadonlyArray<BiasLedger>): ReadonlyArray<BiasLedger> {
  return [...entries].sort((left, right) => {
    const monthComparison = left.effectiveMonth.localeCompare(right.effectiveMonth);
    return monthComparison !== 0
      ? monthComparison
      : left.doctorId.localeCompare(right.doctorId);
  });
}

export class LocalStorageBiasLedgerRepository implements BiasLedgerRepository {
  private readonly storageKey: string;
  private readonly seedData: ReadonlyArray<BiasLedger>;

  constructor(options: BrowserStorageRepositoryOptions<BiasLedger> = {}) {
    this.storageKey = options.storageKey ?? STORAGE_KEYS.biasLedgers;
    this.seedData = options.seedData ?? [];
  }

  async listByMonth(effectiveMonth: string): Promise<ReadonlyArray<BiasLedger>> {
    const entries = this.readEntries().filter(
      (entry) => entry.effectiveMonth === effectiveMonth
    );

    return sortBiasLedgers(entries).map(cloneBiasLedger);
  }

  async listByDoctor(doctorId: string): Promise<ReadonlyArray<BiasLedger>> {
    const entries = this.readEntries().filter(
      (entry) => entry.doctorId === doctorId
    );

    return sortBiasLedgers(entries).map(cloneBiasLedger);
  }

  async hasAnyBalanceForCriteria(criteriaId: string): Promise<boolean> {
    return this.readEntries().some((entry) =>
      Object.prototype.hasOwnProperty.call(entry.balances, criteriaId)
    );
  }

  async findByDoctorAndMonth(
    doctorId: string,
    effectiveMonth: string
  ): Promise<BiasLedger | null> {
    const entry = this.readEntries().find(
      (candidate) =>
        candidate.doctorId === doctorId &&
        candidate.effectiveMonth === effectiveMonth
    );

    return entry ? cloneBiasLedger(entry) : null;
  }

  async save(entry: BiasLedger): Promise<BiasLedger> {
    const entries = this.readEntries();
    this.assertUniqueConstraints(entry, entries);

    const nextEntries = entries.filter((candidate) => candidate.id !== entry.id);
    nextEntries.push(cloneBiasLedger(entry));
    this.writeEntries(nextEntries);

    return cloneBiasLedger(entry);
  }

  async saveMany(
    entries: ReadonlyArray<BiasLedger>
  ): Promise<ReadonlyArray<BiasLedger>> {
    const currentEntries = this.readEntries();
    const stagedEntries = currentEntries.filter(
      (currentEntry) =>
        !entries.some((candidate) => candidate.id === currentEntry.id)
    );

    for (const entry of entries) {
      this.assertUniqueConstraints(entry, [...stagedEntries, ...entries]);
    }

    const nextEntries = [...stagedEntries, ...entries.map(cloneBiasLedger)];
    this.writeEntries(nextEntries);

    return sortBiasLedgers(entries).map(cloneBiasLedger);
  }

  private readEntries(): BiasLedger[] {
    return readCollectionFromStorage(this.storageKey, this.seedData).map((entry) =>
      normalizeBiasLedger(entry as BiasLedger & { balance?: BiasLedgerBalances })
    );
  }

  private writeEntries(entries: ReadonlyArray<BiasLedger>): void {
    writeCollectionToStorage(
      this.storageKey,
      sortBiasLedgers(entries).map(cloneBiasLedger)
    );
  }

  private assertUniqueConstraints(
    candidate: BiasLedger,
    entries: ReadonlyArray<BiasLedger>
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
          `Bias ledger already exists for doctor '${candidate.doctorId}' and month '${candidate.effectiveMonth}'.`
        );
      }
    }
  }
}
