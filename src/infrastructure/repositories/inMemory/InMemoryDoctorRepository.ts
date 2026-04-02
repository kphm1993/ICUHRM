import type { Doctor } from "@/domain/models";
import type {
  DoctorRepository,
  DoctorRepositoryFilter
} from "@/domain/repositories";
import { RepositoryConflictError } from "@/domain/repositories";

function cloneDoctor(doctor: Doctor): Doctor {
  return { ...doctor };
}

function sortDoctors(doctors: ReadonlyArray<Doctor>): ReadonlyArray<Doctor> {
  return [...doctors].sort((left, right) => {
    const nameComparison = left.name.localeCompare(right.name);
    return nameComparison !== 0 ? nameComparison : left.id.localeCompare(right.id);
  });
}

export class InMemoryDoctorRepository implements DoctorRepository {
  private readonly doctorsById = new Map<string, Doctor>();

  constructor(seedData: ReadonlyArray<Doctor> = []) {
    for (const doctor of seedData) {
      this.assertUniqueConstraints(doctor);
      this.doctorsById.set(doctor.id, cloneDoctor(doctor));
    }
  }

  async list(filter?: DoctorRepositoryFilter): Promise<ReadonlyArray<Doctor>> {
    const doctors = Array.from(this.doctorsById.values()).filter((doctor) => {
      if (filter?.isActive !== undefined && doctor.isActive !== filter.isActive) {
        return false;
      }

      if (filter?.userId !== undefined && doctor.userId !== filter.userId) {
        return false;
      }

      if (
        filter?.weekendGroup !== undefined &&
        doctor.weekendGroup !== filter.weekendGroup
      ) {
        return false;
      }

      return true;
    });

    return sortDoctors(doctors).map(cloneDoctor);
  }

  async findById(id: string): Promise<Doctor | null> {
    const doctor = this.doctorsById.get(id);
    return doctor ? cloneDoctor(doctor) : null;
  }

  async findByUserId(userId: string): Promise<Doctor | null> {
    const doctor = Array.from(this.doctorsById.values()).find(
      (entry) => entry.userId === userId
    );

    return doctor ? cloneDoctor(doctor) : null;
  }

  async findByUniqueIdentifier(uniqueIdentifier: string): Promise<Doctor | null> {
    const doctor = Array.from(this.doctorsById.values()).find(
      (entry) => entry.uniqueIdentifier === uniqueIdentifier
    );

    return doctor ? cloneDoctor(doctor) : null;
  }

  async save(doctor: Doctor): Promise<Doctor> {
    this.assertUniqueConstraints(doctor);
    this.doctorsById.set(doctor.id, cloneDoctor(doctor));
    return cloneDoctor(doctor);
  }

  private assertUniqueConstraints(candidate: Doctor): void {
    for (const existingDoctor of this.doctorsById.values()) {
      if (existingDoctor.id === candidate.id) {
        continue;
      }

      if (existingDoctor.userId === candidate.userId) {
        throw new RepositoryConflictError(
          `Doctor userId '${candidate.userId}' is already in use.`
        );
      }

      if (existingDoctor.uniqueIdentifier === candidate.uniqueIdentifier) {
        throw new RepositoryConflictError(
          `Doctor uniqueIdentifier '${candidate.uniqueIdentifier}' is already in use.`
        );
      }
    }
  }
}

