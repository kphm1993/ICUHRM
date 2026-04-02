import type { OffRequest } from "@/domain/models";
import type {
  OffRequestRepository,
  OffRequestRepositoryFilter
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

function cloneOffRequest(request: OffRequest): OffRequest {
  return { ...request };
}

function sortOffRequests(
  requests: ReadonlyArray<OffRequest>
): ReadonlyArray<OffRequest> {
  return [...requests].sort((left, right) => {
    const monthComparison = left.rosterMonth.localeCompare(right.rosterMonth);
    if (monthComparison !== 0) {
      return monthComparison;
    }

    const dateComparison = left.date.localeCompare(right.date);
    if (dateComparison !== 0) {
      return dateComparison;
    }

    const priorityComparison = left.priority - right.priority;
    return priorityComparison !== 0
      ? priorityComparison
      : left.requestedAt.localeCompare(right.requestedAt);
  });
}

export class LocalStorageOffRequestRepository implements OffRequestRepository {
  private readonly storageKey: string;
  private readonly seedData: ReadonlyArray<OffRequest>;

  constructor(options: BrowserStorageRepositoryOptions<OffRequest> = {}) {
    this.storageKey = options.storageKey ?? STORAGE_KEYS.offRequests;
    this.seedData = options.seedData ?? [];
  }

  async list(
    filter?: OffRequestRepositoryFilter
  ): Promise<ReadonlyArray<OffRequest>> {
    const requests = this.readEntries().filter((request) => {
      if (
        filter?.rosterMonth !== undefined &&
        request.rosterMonth !== filter.rosterMonth
      ) {
        return false;
      }

      if (filter?.doctorId !== undefined && request.doctorId !== filter.doctorId) {
        return false;
      }

      return true;
    });

    return sortOffRequests(requests).map(cloneOffRequest);
  }

  async findById(id: string): Promise<OffRequest | null> {
    const request = this.readEntries().find((entry) => entry.id === id);
    return request ? cloneOffRequest(request) : null;
  }

  async save(request: OffRequest): Promise<OffRequest> {
    const entries = this.readEntries();
    this.assertUniqueConstraints(request, entries);

    const nextEntries = entries.filter((entry) => entry.id !== request.id);
    nextEntries.push(cloneOffRequest(request));
    this.writeEntries(nextEntries);

    return cloneOffRequest(request);
  }

  async delete(id: string): Promise<void> {
    const entries = this.readEntries();
    const nextEntries = entries.filter((entry) => entry.id !== id);

    if (nextEntries.length === entries.length) {
      throw new RepositoryNotFoundError(`Off request '${id}' was not found.`);
    }

    this.writeEntries(nextEntries);
  }

  private readEntries(): OffRequest[] {
    return readCollectionFromStorage(this.storageKey, this.seedData).map(
      cloneOffRequest
    );
  }

  private writeEntries(entries: ReadonlyArray<OffRequest>): void {
    writeCollectionToStorage(
      this.storageKey,
      sortOffRequests(entries).map(cloneOffRequest)
    );
  }

  private assertUniqueConstraints(
    candidate: OffRequest,
    entries: ReadonlyArray<OffRequest>
  ): void {
    for (const existingRequest of entries) {
      if (existingRequest.id === candidate.id) {
        continue;
      }

      if (
        existingRequest.doctorId === candidate.doctorId &&
        existingRequest.date === candidate.date &&
        existingRequest.shiftPreference === candidate.shiftPreference
      ) {
        throw new RepositoryConflictError(
          `Off request already exists for doctor '${candidate.doctorId}' on '${candidate.date}' with preference '${candidate.shiftPreference}'.`
        );
      }
    }
  }
}
