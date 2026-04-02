import type { Doctor, EntityId, WeekendGroup } from "@/domain/models";

export interface DoctorRepositoryFilter {
  readonly isActive?: boolean;
  readonly userId?: EntityId;
  readonly weekendGroup?: WeekendGroup;
}

export interface DoctorRepository {
  list(filter?: DoctorRepositoryFilter): Promise<ReadonlyArray<Doctor>>;
  findById(id: EntityId): Promise<Doctor | null>;
  findByUserId(userId: EntityId): Promise<Doctor | null>;
  findByUniqueIdentifier(uniqueIdentifier: string): Promise<Doctor | null>;
  save(doctor: Doctor): Promise<Doctor>;
}

