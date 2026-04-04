import type { GroupConstraintTemplate } from "@/domain/models";
import type { GroupConstraintTemplateRepository } from "@/domain/repositories";
import { RepositoryConflictError } from "@/domain/repositories";

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

export class InMemoryGroupConstraintTemplateRepository
  implements GroupConstraintTemplateRepository
{
  private readonly templatesById = new Map<string, GroupConstraintTemplate>();

  constructor(seedData: ReadonlyArray<GroupConstraintTemplate> = []) {
    seedData.forEach((template) => {
      this.assertUniqueCode(template);
      this.templatesById.set(template.id, cloneGroupConstraintTemplate(template));
    });
  }

  async list(): Promise<ReadonlyArray<GroupConstraintTemplate>> {
    return sortGroupConstraintTemplates(
      Array.from(this.templatesById.values())
    ).map(cloneGroupConstraintTemplate);
  }

  async findById(id: string): Promise<GroupConstraintTemplate | null> {
    const template = this.templatesById.get(id);
    return template ? cloneGroupConstraintTemplate(template) : null;
  }

  async findByCode(code: string): Promise<GroupConstraintTemplate | null> {
    const normalizedCode = normalizeCode(code);
    const template = Array.from(this.templatesById.values()).find(
      (entry) => normalizeCode(entry.code) === normalizedCode
    );

    return template ? cloneGroupConstraintTemplate(template) : null;
  }

  async save(template: GroupConstraintTemplate): Promise<GroupConstraintTemplate> {
    this.assertUniqueCode(template);
    this.templatesById.set(template.id, cloneGroupConstraintTemplate(template));
    return cloneGroupConstraintTemplate(template);
  }

  private assertUniqueCode(candidate: GroupConstraintTemplate): void {
    const normalizedCandidateCode = normalizeCode(candidate.code);

    for (const existingTemplate of this.templatesById.values()) {
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
