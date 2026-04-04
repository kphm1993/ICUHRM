import { describe, expect, it } from "vitest";
import type { DutyDesign } from "@/domain/models";
import {
  RepositoryConflictError,
  RepositoryNotFoundError
} from "@/domain/repositories";
import { InMemoryDutyDesignRepository } from "@/infrastructure/repositories/inMemory";

const NOW = "2026-04-03T08:00:00.000Z";

function createDutyDesign(overrides: Partial<DutyDesign> = {}): DutyDesign {
  return {
    id: overrides.id ?? "design-weekday",
    code: overrides.code ?? "WEEKDAY",
    label: overrides.label ?? "Weekday Design",
    description: overrides.description,
    isActive: overrides.isActive ?? true,
    isHolidayDesign: overrides.isHolidayDesign ?? false,
    dutyBlocks: overrides.dutyBlocks ?? [
      {
        shiftTypeId: "shift-type-day",
        doctorCount: 1
      }
    ],
    createdAt: overrides.createdAt ?? NOW,
    updatedAt: overrides.updatedAt ?? NOW
  };
}

describe("InMemoryDutyDesignRepository", () => {
  it("supports create, update, get, listActive, listAll, and findByCode", async () => {
    const repository = new InMemoryDutyDesignRepository();
    const activeDesign = createDutyDesign();
    const inactiveDesign = createDutyDesign({
      id: "design-holiday",
      code: "HOLIDAY",
      label: "Holiday Design",
      isActive: false,
      isHolidayDesign: true
    });

    await repository.create(activeDesign);
    await repository.create(inactiveDesign);

    expect(await repository.getById(activeDesign.id)).toEqual(activeDesign);
    expect(await repository.findByCode("HOLIDAY")).toEqual(inactiveDesign);
    expect(await repository.listActive()).toEqual([activeDesign]);

    const updatedDesign = await repository.update(activeDesign.id, {
      label: "Updated Weekday Design",
      updatedAt: "2026-04-04T08:00:00.000Z"
    });

    expect(updatedDesign.label).toBe("Updated Weekday Design");
    expect(await repository.listAll()).toHaveLength(2);

    await repository.delete(activeDesign.id);

    expect(await repository.getById(activeDesign.id)).toBeNull();
  });

  it("enforces unique duty design codes", async () => {
    const repository = new InMemoryDutyDesignRepository([
      createDutyDesign()
    ]);

    await expect(
      repository.create(
        createDutyDesign({
          id: "design-copy"
        })
      )
    ).rejects.toBeInstanceOf(RepositoryConflictError);
  });

  it("throws not found when updating or deleting an unknown duty design", async () => {
    const repository = new InMemoryDutyDesignRepository();

    await expect(
      repository.update("missing", { label: "Missing" })
    ).rejects.toBeInstanceOf(RepositoryNotFoundError);

    await expect(repository.delete("missing")).rejects.toBeInstanceOf(
      RepositoryNotFoundError
    );
  });
});
