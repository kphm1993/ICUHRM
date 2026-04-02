import type {
  Doctor,
  EntityId,
  WeekendGroup
} from "@/domain/models";
import { notImplemented } from "@/shared/lib/notImplemented";

export interface CreateDoctorInput {
  readonly userId: EntityId;
  readonly name: string;
  readonly phoneNumber: string;
  readonly uniqueIdentifier: string;
  readonly weekendGroup: WeekendGroup;
  readonly temporaryPassword: string;
}

export interface DoctorManagementService {
  listDoctors(): Promise<ReadonlyArray<Doctor>>;
  createDoctor(input: CreateDoctorInput): Promise<Doctor>;
  updateWeekendGroup(doctorId: EntityId, weekendGroup: WeekendGroup): Promise<Doctor>;
  deactivateDoctor(doctorId: EntityId): Promise<void>;
}

export function createDoctorManagementServicePlaceholder(): DoctorManagementService {
  return {
    async listDoctors() {
      throw notImplemented("DoctorManagementService.listDoctors");
    },
    async createDoctor() {
      throw notImplemented("DoctorManagementService.createDoctor");
    },
    async updateWeekendGroup() {
      throw notImplemented("DoctorManagementService.updateWeekendGroup");
    },
    async deactivateDoctor() {
      throw notImplemented("DoctorManagementService.deactivateDoctor");
    }
  };
}

