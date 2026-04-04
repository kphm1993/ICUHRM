import type {
  DutyDesignAssignment,
  EntityId,
  RosterPeriod
} from "@/domain/models";

export interface DutyDesignAssignmentRepository {
  create(assignment: DutyDesignAssignment): Promise<DutyDesignAssignment>;
  update(
    id: EntityId,
    changes: Partial<DutyDesignAssignment>
  ): Promise<DutyDesignAssignment>;
  delete(id: EntityId): Promise<void>;
  getById(id: EntityId): Promise<DutyDesignAssignment | null>;
  listByMonth(period: RosterPeriod): Promise<ReadonlyArray<DutyDesignAssignment>>;
  listAll(): Promise<ReadonlyArray<DutyDesignAssignment>>;
}
