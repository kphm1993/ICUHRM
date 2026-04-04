import { afterEach, describe, expect, it } from "vitest";
import type { GroupConstraintTemplate } from "@/domain/models";
import { RepositoryConflictError } from "@/domain/repositories";
import { LocalStorageGroupConstraintTemplateRepository } from "@/infrastructure/repositories/browserStorage/LocalStorageGroupConstraintTemplateRepository";
import { removeStorageCollection } from "@/infrastructure/repositories/browserStorage/storage";

const STORAGE_KEY = "icu-hrm:test:group-constraint-templates";
const NOW = "2026-04-20T09:00:00.000Z";

function createTemplate(
  overrides: Partial<GroupConstraintTemplate> = {}
): GroupConstraintTemplate {
  return {
    id: overrides.id ?? "template-a",
    code: overrides.code ?? "WEEKDAY_A",
    label: overrides.label ?? "Weekday A",
    rules: {
      allowedDoctorGroupId:
        overrides.rules?.allowedDoctorGroupId ?? "group-a"
    },
    createdAt: overrides.createdAt ?? NOW,
    updatedAt: overrides.updatedAt ?? NOW
  };
}

describe("LocalStorageGroupConstraintTemplateRepository", () => {
  afterEach(() => {
    removeStorageCollection(STORAGE_KEY);
    window.localStorage.clear();
  });

  it("persists templates across repository recreation", async () => {
    const repository = new LocalStorageGroupConstraintTemplateRepository({
      storageKey: STORAGE_KEY,
      seedData: []
    });
    const savedTemplate = await repository.save(createTemplate());

    const reloadedRepository = new LocalStorageGroupConstraintTemplateRepository({
      storageKey: STORAGE_KEY,
      seedData: []
    });

    await expect(reloadedRepository.list()).resolves.toEqual([savedTemplate]);
    await expect(reloadedRepository.findById(savedTemplate.id)).resolves.toEqual(savedTemplate);
    await expect(reloadedRepository.findByCode("weekday_a")).resolves.toEqual(savedTemplate);
  });

  it("rejects duplicate codes case-insensitively", async () => {
    const repository = new LocalStorageGroupConstraintTemplateRepository({
      storageKey: STORAGE_KEY,
      seedData: []
    });

    await repository.save(createTemplate());

    await expect(
      repository.save(
        createTemplate({
          id: "template-b",
          code: "weekday_a"
        })
      )
    ).rejects.toBeInstanceOf(RepositoryConflictError);
  });
});
