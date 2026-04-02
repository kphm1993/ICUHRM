import type { AuditLog } from "@/domain/models";
import type {
  AuditLogRepository,
  AuditLogRepositoryFilter
} from "@/domain/repositories";
import type { BrowserStorageRepositoryOptions } from "@/infrastructure/repositories/browserStorage/storage";
import {
  readCollectionFromStorage,
  STORAGE_KEYS,
  writeCollectionToStorage
} from "@/infrastructure/repositories/browserStorage/storage";

function cloneAuditLog(log: AuditLog): AuditLog {
  return {
    ...log,
    details: { ...log.details }
  };
}

function sortAuditLogs(entries: ReadonlyArray<AuditLog>): ReadonlyArray<AuditLog> {
  return [...entries].sort((left, right) => {
    const createdAtComparison = left.createdAt.localeCompare(right.createdAt);
    return createdAtComparison !== 0
      ? createdAtComparison
      : left.id.localeCompare(right.id);
  });
}

export class LocalStorageAuditLogRepository implements AuditLogRepository {
  private readonly storageKey: string;
  private readonly seedData: ReadonlyArray<AuditLog>;

  constructor(options: BrowserStorageRepositoryOptions<AuditLog> = {}) {
    this.storageKey = options.storageKey ?? STORAGE_KEYS.auditLogs;
    this.seedData = options.seedData ?? [];
  }

  async list(
    filter?: AuditLogRepositoryFilter
  ): Promise<ReadonlyArray<AuditLog>> {
    const logs = this.readEntries().filter((log) => {
      if (filter?.entityType !== undefined && log.entityType !== filter.entityType) {
        return false;
      }

      if (filter?.entityId !== undefined && log.entityId !== filter.entityId) {
        return false;
      }

      if (filter?.actorId !== undefined && log.actorId !== filter.actorId) {
        return false;
      }

      if (filter?.actionType !== undefined && log.actionType !== filter.actionType) {
        return false;
      }

      return true;
    });

    return sortAuditLogs(logs).map(cloneAuditLog);
  }

  async append(log: AuditLog): Promise<AuditLog> {
    const entries = this.readEntries();
    entries.push(cloneAuditLog(log));
    this.writeEntries(entries);
    return cloneAuditLog(log);
  }

  private readEntries(): AuditLog[] {
    return readCollectionFromStorage(this.storageKey, this.seedData).map(
      cloneAuditLog
    );
  }

  private writeEntries(entries: ReadonlyArray<AuditLog>): void {
    writeCollectionToStorage(
      this.storageKey,
      sortAuditLogs(entries).map(cloneAuditLog)
    );
  }
}
