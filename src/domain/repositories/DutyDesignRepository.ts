import type { DutyDesign, EntityId } from "@/domain/models";

export interface DutyDesignRepository {
  create(design: DutyDesign): Promise<DutyDesign>;
  update(
    id: EntityId,
    changes: Partial<DutyDesign>
  ): Promise<DutyDesign>;
  delete(id: EntityId): Promise<void>;
  getById(id: EntityId): Promise<DutyDesign | null>;
  listActive(): Promise<ReadonlyArray<DutyDesign>>;
  listAll(): Promise<ReadonlyArray<DutyDesign>>;
  findByCode(code: string): Promise<DutyDesign | null>;
}
