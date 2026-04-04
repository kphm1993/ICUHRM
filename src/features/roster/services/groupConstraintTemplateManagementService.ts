import type {
  ActorRole,
  EntityId,
  GroupConstraintTemplate
} from "@/domain/models";
import type {
  DoctorGroupRepository,
  GroupConstraintTemplateRepository
} from "@/domain/repositories";
import { RepositoryNotFoundError } from "@/domain/repositories";
import { assertAdminActorRole } from "@/features/admin/services/assertAdminActorRole";
import type { AuditLogService } from "@/features/audit/services/auditLogService";
import { logGroupConstraintTemplateCreated } from "@/features/audit/services/lifecycleAuditLogging";

export interface CreateGroupConstraintTemplateInput {
  readonly code: string;
  readonly label: string;
  readonly allowedDoctorGroupId: EntityId;
  readonly actorId: EntityId;
  readonly actorRole: ActorRole;
}

export interface GroupConstraintTemplateManagementService {
  listGroupConstraintTemplates(): Promise<ReadonlyArray<GroupConstraintTemplate>>;
  createGroupConstraintTemplate(
    input: CreateGroupConstraintTemplateInput
  ): Promise<GroupConstraintTemplate>;
}

export interface GroupConstraintTemplateManagementServiceDependencies {
  readonly groupConstraintTemplateRepository: GroupConstraintTemplateRepository;
  readonly doctorGroupRepository: DoctorGroupRepository;
  readonly auditLogService: AuditLogService;
}

function normalizeTemplateCode(code: string): string {
  const normalizedCode = code.trim().toUpperCase().replace(/\s+/g, "_");

  if (!normalizedCode) {
    throw new Error("Template code is required.");
  }

  return normalizedCode;
}

function normalizeTemplateLabel(label: string): string {
  const normalizedLabel = label.trim();

  if (!normalizedLabel) {
    throw new Error("Template label is required.");
  }

  return normalizedLabel;
}

export function createGroupConstraintTemplateManagementService(
  dependencies: GroupConstraintTemplateManagementServiceDependencies
): GroupConstraintTemplateManagementService {
  return {
    async listGroupConstraintTemplates() {
      return dependencies.groupConstraintTemplateRepository.list();
    },
    async createGroupConstraintTemplate(input) {
      assertAdminActorRole(
        input.actorRole,
        "You do not have permission to manage group constraint templates."
      );

      const code = normalizeTemplateCode(input.code);
      const label = normalizeTemplateLabel(input.label);
      const doctorGroup = await dependencies.doctorGroupRepository.findById(
        input.allowedDoctorGroupId
      );

      if (!doctorGroup) {
        throw new RepositoryNotFoundError(
          `Doctor group '${input.allowedDoctorGroupId}' was not found.`
        );
      }

      const timestamp = new Date().toISOString();
      const template: GroupConstraintTemplate = {
        id: crypto.randomUUID(),
        code,
        label,
        rules: {
          allowedDoctorGroupId: doctorGroup.id
        },
        createdAt: timestamp,
        updatedAt: timestamp
      };
      const savedTemplate =
        await dependencies.groupConstraintTemplateRepository.save(template);

      await logGroupConstraintTemplateCreated(dependencies.auditLogService, {
        actorId: input.actorId,
        actorRole: input.actorRole,
        template: savedTemplate,
        details: {
          code: savedTemplate.code,
          label: savedTemplate.label,
          allowedDoctorGroupId: doctorGroup.id,
          allowedDoctorGroupName: doctorGroup.name
        }
      });

      return savedTemplate;
    }
  };
}
