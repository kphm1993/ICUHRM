import type { GroupConstraintTemplate } from "@/domain/models";
import type { GroupConstraintTemplateRepository } from "@/domain/repositories";
import { RepositoryConflictError } from "@/domain/repositories";
import type { BrowserStorageRepositoryOptions } from "@/infrastructure/repositories/browserStorage/storage";
import {
  readCollectionFromStorage,
  STORAGE_KEYS,
  writeCollectionToStorage
} from "@/infrastructure/repositories/browserStorage/storage";

function cloneGroupConstraintTemplate(
  template: GroupConstraintTemplate
): GroupConstraintTemplate {
  return {
    ...template,
    rules: {
      allowedDoctorGroupId: template.rules.allowedDoctorGroupId
    }
  };
}

function sortGroupConstraintTemplates(
  templates: ReadonlyArray<GroupConstraintTemplate>
): ReadonlyArray<GroupConstraintTemplate> {
  return [...templates].sort((left, right) => {
    const codeComparison = left.code.localeCompare(right.code);
    return codeComparison !== 0 ? codeComparison : left.id.localeCompare(right.id);
  });
}

function normalizeCode(code: string): string {
  return code.trim().toLocaleLowerCase();
}

export class LocalStorageGroupConstraintTemplateRepository
  implements GroupConstraintTemplateRepository
{
  private readonly storageKey: string;
  private readonly seedData: ReadonlyArray<GroupConstraintTemplate>;

  constructor(
    options: BrowserStorageRepositoryOptions<GroupConstraintTemplate> = {}
  ) {
    this.storageKey = options.storageKey ?? STORAGE_KEYS.groupConstraintTemplates;
    this.seedData = options.seedData ?? [];
  }

  async list(): Promise<ReadonlyArray<GroupConstraintTemplate>> {
    return sortGroupConstraintTemplates(this.readEntries()).map(cloneGroupConstraintTemplate);
  }

  async findById(id: string): Promise<GroupConstraintTemplate | null> {
    const template = this.readEntries().find((entry) => entry.id === id);
    return template ? cloneGroupConstraintTemplate(template) : null;
  }

  async findByCode(code: string): Promise<GroupConstraintTemplate | null> {
    const normalizedCode = normalizeCode(code);
    const template = this.readEntries().find(
      (entry) => normalizeCode(entry.code) === normalizedCode
    );

    return template ? cloneGroupConstraintTemplate(template) : null;
  }

  async save(template: GroupConstraintTemplate): Promise<GroupConstraintTemplate> {
    const entries = this.readEntries();
    this.assertUniqueCode(template, entries);

    const nextEntries = entries.filter((entry) => entry.id !== template.id);
    nextEntries.push(cloneGroupConstraintTemplate(template));
    this.writeEntries(nextEntries);

    return cloneGroupConstraintTemplate(template);
  }

  private readEntries(): GroupConstraintTemplate[] {
    return readCollectionFromStorage(this.storageKey, this.seedData).map(
      cloneGroupConstraintTemplate
    );
  }

  private writeEntries(entries: ReadonlyArray<GroupConstraintTemplate>): void {
    writeCollectionToStorage(
      this.storageKey,
      sortGroupConstraintTemplates(entries).map(cloneGroupConstraintTemplate)
    );
  }

  private assertUniqueCode(
    candidate: GroupConstraintTemplate,
    entries: ReadonlyArray<GroupConstraintTemplate>
  ): void {
    const normalizedCandidateCode = normalizeCode(candidate.code);

    for (const existingTemplate of entries) {
      if (existingTemplate.id === candidate.id) {
        continue;
      }

      if (normalizeCode(existingTemplate.code) === normalizedCandidateCode) {
        throw new RepositoryConflictError(
          `Group constraint template code '${candidate.code}' already exists.`
        );
      }
    }
  }
}
