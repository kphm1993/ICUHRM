import type { DutyDesign, DutyDesignBlock } from "@/domain/models";
import type { DutyDesignRepository } from "@/domain/repositories";
import {
  RepositoryConflictError,
  RepositoryNotFoundError
} from "@/domain/repositories";

function cloneDutyDesignBlock(block: DutyDesignBlock): DutyDesignBlock {
  return { ...block };
}

function cloneDutyDesign(design: DutyDesign): DutyDesign {
  return {
    ...design,
    dutyBlocks: design.dutyBlocks.map(cloneDutyDesignBlock)
  };
}

function sortDutyDesigns(
  designs: ReadonlyArray<DutyDesign>
): ReadonlyArray<DutyDesign> {
  return [...designs].sort((left, right) => {
    const labelComparison = left.label.localeCompare(right.label);
    return labelComparison !== 0
      ? labelComparison
      : left.code.localeCompare(right.code);
  });
}

export class InMemoryDutyDesignRepository implements DutyDesignRepository {
  private readonly designsById = new Map<string, DutyDesign>();

  constructor(seedData: ReadonlyArray<DutyDesign> = []) {
    for (const design of seedData) {
      this.assertUniqueCode(design);
      this.designsById.set(design.id, cloneDutyDesign(design));
    }
  }

  async create(design: DutyDesign): Promise<DutyDesign> {
    this.assertUniqueCode(design);
    this.designsById.set(design.id, cloneDutyDesign(design));
    return cloneDutyDesign(design);
  }

  async update(
    id: string,
    changes: Partial<DutyDesign>
  ): Promise<DutyDesign> {
    const existingDesign = this.designsById.get(id);

    if (!existingDesign) {
      throw new RepositoryNotFoundError(`Duty design '${id}' was not found.`);
    }

    const nextDesign: DutyDesign = {
      ...existingDesign,
      ...changes,
      id: existingDesign.id,
      dutyBlocks: (changes.dutyBlocks ?? existingDesign.dutyBlocks).map(
        cloneDutyDesignBlock
      ),
      createdAt: existingDesign.createdAt,
      updatedAt: changes.updatedAt ?? new Date().toISOString()
    };

    this.assertUniqueCode(nextDesign);
    this.designsById.set(id, cloneDutyDesign(nextDesign));
    return cloneDutyDesign(nextDesign);
  }

  async delete(id: string): Promise<void> {
    const wasDeleted = this.designsById.delete(id);

    if (!wasDeleted) {
      throw new RepositoryNotFoundError(`Duty design '${id}' was not found.`);
    }
  }

  async getById(id: string): Promise<DutyDesign | null> {
    const design = this.designsById.get(id);
    return design ? cloneDutyDesign(design) : null;
  }

  async listActive(): Promise<ReadonlyArray<DutyDesign>> {
    return sortDutyDesigns(
      Array.from(this.designsById.values()).filter((design) => design.isActive)
    ).map(cloneDutyDesign);
  }

  async listAll(): Promise<ReadonlyArray<DutyDesign>> {
    return sortDutyDesigns(Array.from(this.designsById.values())).map(
      cloneDutyDesign
    );
  }

  async findByCode(code: string): Promise<DutyDesign | null> {
    const design = Array.from(this.designsById.values()).find(
      (entry) => entry.code === code
    );
    return design ? cloneDutyDesign(design) : null;
  }

  private assertUniqueCode(candidate: DutyDesign): void {
    for (const existingDesign of this.designsById.values()) {
      if (existingDesign.id === candidate.id) {
        continue;
      }

      if (existingDesign.code === candidate.code) {
        throw new RepositoryConflictError(
          `Duty design code '${candidate.code}' is already in use.`
        );
      }
    }
  }
}
