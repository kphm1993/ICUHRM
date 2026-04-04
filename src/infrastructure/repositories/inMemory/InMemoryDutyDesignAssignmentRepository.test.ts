import { describe, expect, it } from "vitest";
import type { DutyDesignAssignment } from "@/domain/models";
import {
  RepositoryConflictError,
  RepositoryNotFoundError
} from "@/domain/repositories";
import { InMemoryDutyDesignAssignmentRepository } from "@/infrastructure/repositories/inMemory";

const NOW = "2026-04-03T08:00:00.000Z";

function createAssignment(
  overrides: Partial<DutyDesignAssignment> = {}
): DutyDesignAssignment {
  return {
    id: overrides.id ?? "assignment-1",
    date: overrides.date ?? "2026-04-10",
    dutyDesignId: overrides.dutyDesignId ?? "design-weekday",
    isHolidayOverride: overrides.isHolidayOverride ?? false,
    createdAt: overrides.createdAt ?? NOW,
    updatedAt: overrides.updatedAt ?? NOW
  };
}

describe("InMemoryDutyDesignAssignmentRepository", () => {
  it("supports create, update, get, listByMonth, listAll, and delete", async () => {
    const repository = new InMemoryDutyDesignAssignmentRepository();
    const aprilAssignment = createAssignment();
    const mayAssignment = createAssignment({
      id: "assignment-2",
      date: "2026-05-01",
      dutyDesignId: "design-holiday"
    });

    await repository.create(aprilAssignment);
    await repository.create(mayAssignment);

    expect(await repository.getById(aprilAssignment.id)).toEqual(aprilAssignment);
    expect(
      await repository.listByMonth({
        startDate: "2026-04-01",
        endDate: "2026-04-30"
      })
    ).toEqual([aprilAssignment]);

    const updatedAssignment = await repository.update(aprilAssignment.id, {
      isHolidayOverride: true,
      updatedAt: "2026-04-04T08:00:00.000Z"
    });

    expect(updatedAssignment.isHolidayOverride).toBe(true);
    expect(await repository.listAll()).toHaveLength(2);

    await repository.delete(aprilAssignment.id);

    expect(await repository.getById(aprilAssignment.id)).toBeNull();
  });

  it("allows one standard and one holiday override assignment per date", async () => {
    const repository = new InMemoryDutyDesignAssignmentRepository([
      createAssignment()
    ]);

    await expect(
      repository.create(
        createAssignment({
          id: "assignment-2",
          dutyDesignId: "design-holiday",
          isHolidayOverride: true
        })
      )
    ).resolves.toMatchObject({
      id: "assignment-2",
      date: "2026-04-10",
      isHolidayOverride: true
    });
  });

  it("rejects duplicate assignments for the same date and override type", async () => {
    const repository = new InMemoryDutyDesignAssignmentRepository([
      createAssignment(),
      createAssignment({
        id: "assignment-holiday",
        dutyDesignId: "design-holiday",
        isHolidayOverride: true
      })
    ]);

    await expect(
      repository.create(
        createAssignment({
          id: "assignment-duplicate-standard",
          dutyDesignId: "design-other"
        })
      )
    ).rejects.toBeInstanceOf(RepositoryConflictError);

    await expect(
      repository.create(
        createAssignment({
          id: "assignment-duplicate-holiday",
          dutyDesignId: "design-other-holiday",
          isHolidayOverride: true
        })
      )
    ).rejects.toBeInstanceOf(RepositoryConflictError);
  });

  it("throws not found when updating or deleting an unknown assignment", async () => {
    const repository = new InMemoryDutyDesignAssignmentRepository();

    await expect(
      repository.update("missing", { isHolidayOverride: true })
    ).rejects.toBeInstanceOf(RepositoryNotFoundError);

    await expect(repository.delete("missing")).rejects.toBeInstanceOf(
      RepositoryNotFoundError
    );
  });
});
