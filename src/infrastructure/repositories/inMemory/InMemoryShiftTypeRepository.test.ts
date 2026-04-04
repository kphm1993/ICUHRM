import { describe, expect, it } from "vitest";
import type { ShiftType } from "@/domain/models";
import {
  RepositoryConflictError,
  RepositoryNotFoundError
} from "@/domain/repositories";
import { InMemoryShiftTypeRepository } from "@/infrastructure/repositories/inMemory";

const NOW = "2026-04-03T08:00:00.000Z";

function createShiftType(overrides: Partial<ShiftType> = {}): ShiftType {
  return {
    id: overrides.id ?? "shift-type-day",
    code: overrides.code ?? "DAY",
    label: overrides.label ?? "Day",
    startTime: overrides.startTime ?? "08:00",
    endTime: overrides.endTime ?? "20:00",
    category: overrides.category ?? "DAY",
    isActive: overrides.isActive ?? true,
    createdAt: overrides.createdAt ?? NOW,
    updatedAt: overrides.updatedAt ?? NOW
  };
}

describe("InMemoryShiftTypeRepository", () => {
  it("supports create, update, get, list, and delete", async () => {
    const repository = new InMemoryShiftTypeRepository();
    const dayShift = createShiftType();
    const nightShift = createShiftType({
      id: "shift-type-night",
      code: "NIGHT",
      label: "Night",
      startTime: "20:00",
      endTime: "08:00",
      category: "NIGHT",
      isActive: false
    });

    await repository.create(dayShift);
    await repository.create(nightShift);

    expect(await repository.getById(dayShift.id)).toEqual(dayShift);
    expect(await repository.listActive()).toEqual([dayShift]);
    expect(await repository.listAll({ category: "NIGHT" })).toEqual([nightShift]);

    const updatedShift = await repository.update(dayShift.id, {
      label: "Extended Day",
      updatedAt: "2026-04-04T08:00:00.000Z"
    });

    expect(updatedShift.label).toBe("Extended Day");
    expect(await repository.listAll()).toHaveLength(2);

    await repository.delete(dayShift.id);

    expect(await repository.getById(dayShift.id)).toBeNull();
  });

  it("enforces unique shift type codes", async () => {
    const repository = new InMemoryShiftTypeRepository([
      createShiftType()
    ]);

    await expect(
      repository.create(
        createShiftType({
          id: "shift-type-day-copy"
        })
      )
    ).rejects.toBeInstanceOf(RepositoryConflictError);
  });

  it("throws not found when updating or deleting an unknown shift type", async () => {
    const repository = new InMemoryShiftTypeRepository();

    await expect(
      repository.update("missing", { label: "Missing" })
    ).rejects.toBeInstanceOf(RepositoryNotFoundError);

    await expect(repository.delete("missing")).rejects.toBeInstanceOf(
      RepositoryNotFoundError
    );
  });
});
