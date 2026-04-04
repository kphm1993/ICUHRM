import type { Doctor } from "@/domain/models";
import type {
  DoctorRepository,
  DoctorRepositoryFilter
} from "@/domain/repositories";
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

function cloneDoctor(doctor: Doctor): Doctor {
  return {
    ...doctor,
    groupId: doctor.groupId,
    weekendGroup: undefined
  };
}

function sortDoctors(doctors: ReadonlyArray<Doctor>): ReadonlyArray<Doctor> {
  return [...doctors].sort((left, right) => {
    const nameComparison = left.name.localeCompare(right.name);
    return nameComparison !== 0 ? nameComparison : left.id.localeCompare(right.id);
  });
}

export class LocalStorageDoctorRepository implements DoctorRepository {
  private readonly storageKey: string;
  private readonly seedData: ReadonlyArray<Doctor>;

  constructor(options: BrowserStorageRepositoryOptions<Doctor> = {}) {
    this.storageKey = options.storageKey ?? STORAGE_KEYS.doctors;
    this.seedData = options.seedData ?? [];
  }

  async list(filter?: DoctorRepositoryFilter): Promise<ReadonlyArray<Doctor>> {
    const doctors = this.readEntries().filter((doctor) => {
      if (filter?.isActive !== undefined && doctor.isActive !== filter.isActive) {
        return false;
      }

      if (filter?.userId !== undefined && doctor.userId !== filter.userId) {
        return false;
      }

      if (filter?.groupId !== undefined && doctor.groupId !== filter.groupId) {
        return false;
      }

      if (
        filter?.weekendGroup !== undefined &&
        doctor.weekendGroup !== filter.weekendGroup
      ) {
        return false;
      }

      return true;
    });

    return sortDoctors(doctors).map(cloneDoctor);
  }

  async findById(id: string): Promise<Doctor | null> {
    const doctor = this.readEntries().find((entry) => entry.id === id);
    return doctor ? cloneDoctor(doctor) : null;
  }

  async findByUserId(userId: string): Promise<Doctor | null> {
    const doctor = this.readEntries().find((entry) => entry.userId === userId);
    return doctor ? cloneDoctor(doctor) : null;
  }

  async findByUniqueIdentifier(uniqueIdentifier: string): Promise<Doctor | null> {
    const doctor = this.readEntries().find(
      (entry) => entry.uniqueIdentifier === uniqueIdentifier
    );
    return doctor ? cloneDoctor(doctor) : null;
  }

  async save(doctor: Doctor): Promise<Doctor> {
    const entries = this.readEntries();
    const normalizedDoctor = {
      ...doctor,
      groupId: doctor.groupId,
      weekendGroup: undefined
    } satisfies Doctor;

    this.assertUniqueConstraints(normalizedDoctor, entries);

    const nextEntries = entries.filter((entry) => entry.id !== normalizedDoctor.id);
    nextEntries.push(cloneDoctor(normalizedDoctor));
    this.writeEntries(nextEntries);

    return cloneDoctor(normalizedDoctor);
  }

  async delete(id: string): Promise<void> {
    const entries = this.readEntries();
    const nextEntries = entries.filter((entry) => entry.id !== id);

    if (nextEntries.length === entries.length) {
      throw new RepositoryNotFoundError(`Doctor '${id}' was not found.`);
    }

    this.writeEntries(nextEntries);
  }

  private readEntries(): Doctor[] {
    return readCollectionFromStorage(this.storageKey, this.seedData).map((entry) =>
      cloneDoctor({
        ...entry,
        groupId: entry.groupId,
        weekendGroup: undefined
      } as Doctor)
    );
  }

  private writeEntries(entries: ReadonlyArray<Doctor>): void {
    writeCollectionToStorage(
      this.storageKey,
      sortDoctors(entries).map(cloneDoctor)
    );
  }

  private assertUniqueConstraints(
    candidate: Doctor,
    entries: ReadonlyArray<Doctor>
  ): void {
    for (const existingDoctor of entries) {
      if (existingDoctor.id === candidate.id) {
        continue;
      }

      if (existingDoctor.userId === candidate.userId) {
        throw new RepositoryConflictError(
          `Doctor userId '${candidate.userId}' is already in use.`
        );
      }

      if (existingDoctor.uniqueIdentifier === candidate.uniqueIdentifier) {
        throw new RepositoryConflictError(
          `Doctor uniqueIdentifier '${candidate.uniqueIdentifier}' is already in use.`
        );
      }
    }
  }
}
