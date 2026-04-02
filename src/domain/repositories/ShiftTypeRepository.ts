import type { EntityId, ShiftKind, ShiftType } from "@/domain/models";

export interface ShiftTypeRepositoryFilter {
  readonly isActive?: boolean;
  readonly defaultKind?: ShiftKind;
}

export interface ShiftTypeRepository {
  list(filter?: ShiftTypeRepositoryFilter): Promise<ReadonlyArray<ShiftType>>;
  findById(id: EntityId): Promise<ShiftType | null>;
  findByCode(code: string): Promise<ShiftType | null>;
  save(shiftType: ShiftType): Promise<ShiftType>;
}

