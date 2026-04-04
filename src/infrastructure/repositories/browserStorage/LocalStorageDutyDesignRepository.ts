import type { DutyDesign, DutyDesignBlock } from "@/domain/models";
import type { DutyDesignRepository } from "@/domain/repositories";
import {
  RepositoryConflictError,
  RepositoryNotFoundError
} from "@/domain/repositories";
import type { BrowserStorageRepositoryOptions } from "@/infrastructure/repositories/browserStorage/storage";
import {
  readCollectionFromStorage,
  STORAGE_KEYS,
  writeCollectionToStorage
} from "@/infrastructure/repositories/browserStorage/storage";

function cloneDutyDesignBlock(block: DutyDesignBlock): DutyDesignBlock {
  return { ...block };
}

function cloneDutyDesign(design: DutyDesign): DutyDesign {
  return {
    ...design,
    dutyBlocks: design.dutyBlocks.map(cloneDutyDesignBlock)
  };
}

function sortDutyDesigns(
  designs: ReadonlyArray<DutyDesign>
): ReadonlyArray<DutyDesign> {
  return [...designs].sort((left, right) => {
    const labelComparison = left.label.localeCompare(right.label);
    return labelComparison !== 0
      ? labelComparison
      : left.code.localeCompare(right.code);
  });
}

export class LocalStorageDutyDesignRepository implements DutyDesignRepository {
  private readonly storageKey: string;
  private readonly seedData: ReadonlyArray<DutyDesign>;

  constructor(options: BrowserStorageRepositoryOptions<DutyDesign> = {}) {
    this.storageKey = options.storageKey ?? STORAGE_KEYS.dutyDesigns;
    this.seedData = options.seedData ?? [];
  }

  async create(design: DutyDesign): Promise<DutyDesign> {
    const entries = this.readEntries();
    this.assertUniqueCode(design, entries);
    entries.push(cloneDutyDesign(design));
    this.writeEntries(entries);
    return cloneDutyDesign(design);
  }

  async update(id: string, changes: Partial<DutyDesign>): Promise<DutyDesign> {
    const entries = this.readEntries();
    const existingDesign = entries.find((entry) => entry.id === id);

    if (!existingDesign) {
      throw new RepositoryNotFoundError(`Duty design '${id}' was not found.`);
    }

    const nextDesign: DutyDesign = {
      ...existingDesign,
      ...changes,
      id: existingDesign.id,
      dutyBlocks: (changes.dutyBlocks ?? existingDesign.dutyBlocks).map(
        cloneDutyDesignBlock
      ),
      createdAt: existingDesign.createdAt,
      updatedAt: changes.updatedAt ?? existingDesign.updatedAt
    };

    this.assertUniqueCode(nextDesign, entries);
    const nextEntries = entries.filter((entry) => entry.id !== id);
    nextEntries.push(cloneDutyDesign(nextDesign));
    this.writeEntries(nextEntries);
    return cloneDutyDesign(nextDesign);
  }

  async delete(id: string): Promise<void> {
    const entries = this.readEntries();
    const nextEntries = entries.filter((entry) => entry.id !== id);

    if (nextEntries.length === entries.length) {
      throw new RepositoryNotFoundError(`Duty design '${id}' was not found.`);
    }

    this.writeEntries(nextEntries);
  }

  async getById(id: string): Promise<DutyDesign | null> {
    const design = this.readEntries().find((entry) => entry.id === id);
    return design ? cloneDutyDesign(design) : null;
  }

  async listActive(): Promise<ReadonlyArray<DutyDesign>> {
    return sortDutyDesigns(
      this.readEntries().filter((design) => design.isActive)
    ).map(cloneDutyDesign);
  }

  async listAll(): Promise<ReadonlyArray<DutyDesign>> {
    return sortDutyDesigns(this.readEntries()).map(cloneDutyDesign);
  }

  async findByCode(code: string): Promise<DutyDesign | null> {
    const design = this.readEntries().find((entry) => entry.code === code);
    return design ? cloneDutyDesign(design) : null;
  }

  private readEntries(): DutyDesign[] {
    return readCollectionFromStorage(this.storageKey, this.seedData).map(
      cloneDutyDesign
    );
  }

  private writeEntries(entries: ReadonlyArray<DutyDesign>): void {
    writeCollectionToStorage(
      this.storageKey,
      sortDutyDesigns(entries).map(cloneDutyDesign)
    );
  }

  private assertUniqueCode(
    candidate: DutyDesign,
    entries: ReadonlyArray<DutyDesign>
  ): void {
    for (const existingDesign of entries) {
      if (existingDesign.id === candidate.id) {
        continue;
      }

      if (existingDesign.code === candidate.code) {
        throw new RepositoryConflictError(
          `Duty design code '${candidate.code}' is already in use.`
        );
      }
    }
  }
}
