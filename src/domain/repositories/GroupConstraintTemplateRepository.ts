import type { EntityId, GroupConstraintTemplate } from "@/domain/models";

export interface GroupConstraintTemplateRepository {
  list(): Promise<ReadonlyArray<GroupConstraintTemplate>>;
  findById(id: EntityId): Promise<GroupConstraintTemplate | null>;
  findByCode(code: string): Promise<GroupConstraintTemplate | null>;
  save(template: GroupConstraintTemplate): Promise<GroupConstraintTemplate>;
}
