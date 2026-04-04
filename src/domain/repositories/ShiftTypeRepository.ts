import type { EntityId, ShiftKind, ShiftType } from "@/domain/models";

export interface ShiftTypeRepositoryFilter {
  readonly isActive?: boolean;
  readonly category?: ShiftKind;
}

export interface ShiftTypeRepository {
  create(shiftType: ShiftType): Promise<ShiftType>;
  update(
    id: EntityId,
    changes: Partial<ShiftType>
  ): Promise<ShiftType>;
  delete(id: EntityId): Promise<void>;
  getById(id: EntityId): Promise<ShiftType | null>;
  listActive(filter?: Omit<ShiftTypeRepositoryFilter, "isActive">): Promise<ReadonlyArray<ShiftType>>;
  listAll(filter?: ShiftTypeRepositoryFilter): Promise<ReadonlyArray<ShiftType>>;
}
