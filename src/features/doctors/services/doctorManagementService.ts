import type {
  Doctor,
  EntityId,
  WeekendGroup
} from "@/domain/models";
import type { DoctorRepository } from "@/domain/repositories";
import { RepositoryNotFoundError } from "@/domain/repositories";

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

export interface DoctorManagementServiceDependencies {
  readonly doctorRepository: DoctorRepository;
}

export function createDoctorManagementService(
  dependencies: DoctorManagementServiceDependencies
): DoctorManagementService {
  return {
    async listDoctors() {
      return dependencies.doctorRepository.list();
    },
    async createDoctor(input) {
      const timestamp = new Date().toISOString();

      const doctor: Doctor = {
        id: crypto.randomUUID(),
        userId: input.userId,
        name: input.name,
        phoneNumber: input.phoneNumber,
        uniqueIdentifier: input.uniqueIdentifier,
        weekendGroup: input.weekendGroup,
        isActive: true,
        createdAt: timestamp,
        updatedAt: timestamp
      };

      // TODO: Provision the user credential using temporaryPassword when auth wiring is added.
      return dependencies.doctorRepository.save(doctor);
    },
    async updateWeekendGroup(doctorId, weekendGroup) {
      const doctor = await dependencies.doctorRepository.findById(doctorId);

      if (!doctor) {
        throw new RepositoryNotFoundError(`Doctor '${doctorId}' was not found.`);
      }

      return dependencies.doctorRepository.save({
        ...doctor,
        weekendGroup,
        updatedAt: new Date().toISOString()
      });
    },
    async deactivateDoctor(doctorId) {
      const doctor = await dependencies.doctorRepository.findById(doctorId);

      if (!doctor) {
        throw new RepositoryNotFoundError(`Doctor '${doctorId}' was not found.`);
      }

      if (!doctor.isActive) {
        return;
      }

      await dependencies.doctorRepository.save({
        ...doctor,
        isActive: false,
        updatedAt: new Date().toISOString()
      });
    }
  };
}
