import type { DoctorGroup } from "@/domain/models";
import type { DoctorGroupRepository } from "@/domain/repositories";
import { RepositoryConflictError } from "@/domain/repositories";
import type { BrowserStorageRepositoryOptions } from "@/infrastructure/repositories/browserStorage/storage";
import {
  readCollectionFromStorage,
  STORAGE_KEYS,
  writeCollectionToStorage
} from "@/infrastructure/repositories/browserStorage/storage";

function cloneDoctorGroup(group: DoctorGroup): DoctorGroup {
  return { ...group };
}

function sortDoctorGroups(
  groups: ReadonlyArray<DoctorGroup>
): ReadonlyArray<DoctorGroup> {
  return [...groups].sort((left, right) => {
    const nameComparison = left.name.localeCompare(right.name);
    return nameComparison !== 0 ? nameComparison : left.id.localeCompare(right.id);
  });
}

function normalizeName(name: string): string {
  return name.trim().toLocaleLowerCase();
}

export class LocalStorageDoctorGroupRepository implements DoctorGroupRepository {
  private readonly storageKey: string;
  private readonly seedData: ReadonlyArray<DoctorGroup>;

  constructor(options: BrowserStorageRepositoryOptions<DoctorGroup> = {}) {
    this.storageKey = options.storageKey ?? STORAGE_KEYS.doctorGroups;
    this.seedData = options.seedData ?? [];
  }

  async list(): Promise<ReadonlyArray<DoctorGroup>> {
    return sortDoctorGroups(this.readEntries()).map(cloneDoctorGroup);
  }

  async findById(id: string): Promise<DoctorGroup | null> {
    const group = this.readEntries().find((entry) => entry.id === id);
    return group ? cloneDoctorGroup(group) : null;
  }

  async findByName(name: string): Promise<DoctorGroup | null> {
    const normalizedName = normalizeName(name);
    const group = this.readEntries().find(
      (entry) => normalizeName(entry.name) === normalizedName
    );

    return group ? cloneDoctorGroup(group) : null;
  }

  async save(group: DoctorGroup): Promise<DoctorGroup> {
    const entries = this.readEntries();
    this.assertUniqueName(group, entries);

    const nextEntries = entries.filter((entry) => entry.id !== group.id);
    nextEntries.push(cloneDoctorGroup(group));
    this.writeEntries(nextEntries);

    return cloneDoctorGroup(group);
  }

  private readEntries(): DoctorGroup[] {
    return readCollectionFromStorage(this.storageKey, this.seedData).map(
      cloneDoctorGroup
    );
  }

  private writeEntries(entries: ReadonlyArray<DoctorGroup>): void {
    writeCollectionToStorage(
      this.storageKey,
      sortDoctorGroups(entries).map(cloneDoctorGroup)
    );
  }

  private assertUniqueName(
    candidate: DoctorGroup,
    entries: ReadonlyArray<DoctorGroup>
  ): void {
    const normalizedCandidateName = normalizeName(candidate.name);

    for (const existingGroup of entries) {
      if (existingGroup.id === candidate.id) {
        continue;
      }

      if (normalizeName(existingGroup.name) === normalizedCandidateName) {
        throw new RepositoryConflictError(
          `Doctor group '${candidate.name}' already exists.`
        );
      }
    }
  }
}
