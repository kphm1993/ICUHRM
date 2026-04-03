export const STORAGE_KEYS = {
  doctors: "icu-hrm:v1:doctors",
  dutyLocations: "icu-hrm:v1:duty-locations",
  biasCriteria: "icu-hrm:v1:bias-criteria",
  rosterSnapshots: "icu-hrm:v1:roster-snapshots",
  auditLogs: "icu-hrm:v1:audit-logs",
  offRequests: "icu-hrm:v1:off-requests",
  biasLedgers: "icu-hrm:v1:bias-ledgers",
  weekdayPairBiasLedgers: "icu-hrm:v1:weekday-pair-bias-ledgers"
} as const;

export interface BrowserStorageRepositoryOptions<T> {
  readonly storageKey?: string;
  readonly seedData?: ReadonlyArray<T>;
}

function getLocalStorage(): Storage | null {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage;
}

export function readCollectionFromStorage<T>(
  storageKey: string,
  seedData: ReadonlyArray<T> = []
): T[] {
  const storage = getLocalStorage();

  if (!storage) {
    return [...seedData];
  }

  const storedValue = storage.getItem(storageKey);

  if (storedValue === null) {
    storage.setItem(storageKey, JSON.stringify(seedData));
    return [...seedData];
  }

  try {
    const parsed = JSON.parse(storedValue);

    if (Array.isArray(parsed)) {
      return parsed as T[];
    }
  } catch {
    storage.setItem(storageKey, JSON.stringify(seedData));
    return [...seedData];
  }

  storage.setItem(storageKey, JSON.stringify(seedData));
  return [...seedData];
}

export function writeCollectionToStorage<T>(
  storageKey: string,
  entries: ReadonlyArray<T>
): void {
  const storage = getLocalStorage();

  if (!storage) {
    return;
  }

  storage.setItem(storageKey, JSON.stringify(entries));
}

export function removeStorageCollection(storageKey: string): void {
  const storage = getLocalStorage();

  if (!storage) {
    return;
  }

  storage.removeItem(storageKey);
}
