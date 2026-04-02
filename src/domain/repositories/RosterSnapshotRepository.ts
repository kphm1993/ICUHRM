import type {
  EntityId,
  RosterStatus,
  RosterSnapshot,
  YearMonthString
} from "@/domain/models";

export interface RosterSnapshotRepositoryFilter {
  readonly rosterMonth?: YearMonthString;
  readonly statuses?: ReadonlyArray<RosterStatus>;
}

export interface RosterSnapshotRepository {
  list(filter?: RosterSnapshotRepositoryFilter): Promise<ReadonlyArray<RosterSnapshot>>;
  findById(id: EntityId): Promise<RosterSnapshot | null>;
  save(snapshot: RosterSnapshot): Promise<RosterSnapshot>;
}
