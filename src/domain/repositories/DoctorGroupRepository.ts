import type { DoctorGroup, EntityId } from "@/domain/models";

export interface DoctorGroupRepository {
  list(): Promise<ReadonlyArray<DoctorGroup>>;
  findById(id: EntityId): Promise<DoctorGroup | null>;
  findByName(name: string): Promise<DoctorGroup | null>;
  save(group: DoctorGroup): Promise<DoctorGroup>;
}
