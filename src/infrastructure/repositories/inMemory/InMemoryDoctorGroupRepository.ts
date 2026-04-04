import type { DoctorGroup } from "@/domain/models";
import type { DoctorGroupRepository } from "@/domain/repositories";
import { RepositoryConflictError } from "@/domain/repositories";

function cloneDoctorGroup(group: DoctorGroup): DoctorGroup {
  return { ...group };
}

function sortDoctorGroups(
  groups: ReadonlyArray<DoctorGroup>
): ReadonlyArray<DoctorGroup> {
  return [...groups].sort((left, right) => {
    const nameComparison = left.name.localeCompare(right.name);
    return nameComparison !== 0 ? nameComparison : left.id.localeCompare(right.id);
  });
}

function normalizeName(name: string): string {
  return name.trim().toLocaleLowerCase();
}

export class InMemoryDoctorGroupRepository implements DoctorGroupRepository {
  private readonly groupsById = new Map<string, DoctorGroup>();

  constructor(seedData: ReadonlyArray<DoctorGroup> = []) {
    for (const group of seedData) {
      this.assertUniqueName(group);
      this.groupsById.set(group.id, cloneDoctorGroup(group));
    }
  }

  async list(): Promise<ReadonlyArray<DoctorGroup>> {
    return sortDoctorGroups(Array.from(this.groupsById.values())).map(cloneDoctorGroup);
  }

  async findById(id: string): Promise<DoctorGroup | null> {
    const group = this.groupsById.get(id);
    return group ? cloneDoctorGroup(group) : null;
  }

  async findByName(name: string): Promise<DoctorGroup | null> {
    const normalizedName = normalizeName(name);
    const group = Array.from(this.groupsById.values()).find(
      (entry) => normalizeName(entry.name) === normalizedName
    );

    return group ? cloneDoctorGroup(group) : null;
  }

  async save(group: DoctorGroup): Promise<DoctorGroup> {
    this.assertUniqueName(group);
    this.groupsById.set(group.id, cloneDoctorGroup(group));
    return cloneDoctorGroup(group);
  }

  private assertUniqueName(candidate: DoctorGroup): void {
    const normalizedCandidateName = normalizeName(candidate.name);

    for (const existingGroup of this.groupsById.values()) {
      if (existingGroup.id === candidate.id) {
        continue;
      }

      if (normalizeName(existingGroup.name) === normalizedCandidateName) {
        throw new RepositoryConflictError(
          `Doctor group '${candidate.name}' already exists.`
        );
      }
    }
  }
}
