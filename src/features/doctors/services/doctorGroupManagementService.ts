import type { ActorRole, DoctorGroup, EntityId } from "@/domain/models";
import type { DoctorGroupRepository } from "@/domain/repositories";
import { assertAdminActorRole } from "@/features/admin/services/assertAdminActorRole";
import type { AuditLogService } from "@/features/audit/services/auditLogService";

export interface CreateDoctorGroupInput {
  readonly name: string;
  readonly actorId: EntityId;
  readonly actorRole: ActorRole;
}

export interface DoctorGroupManagementService {
  listDoctorGroups(): Promise<ReadonlyArray<DoctorGroup>>;
  createDoctorGroup(input: CreateDoctorGroupInput): Promise<DoctorGroup>;
}

export interface DoctorGroupManagementServiceDependencies {
  readonly doctorGroupRepository: DoctorGroupRepository;
  readonly auditLogService: AuditLogService;
}

function normalizeGroupName(name: string): string {
  const normalizedName = name.trim();

  if (!normalizedName) {
    throw new Error("Group name is required.");
  }

  return normalizedName;
}

export function createDoctorGroupManagementService(
  dependencies: DoctorGroupManagementServiceDependencies
): DoctorGroupManagementService {
  return {
    async listDoctorGroups() {
      return dependencies.doctorGroupRepository.list();
    },
    async createDoctorGroup(input) {
      assertAdminActorRole(
        input.actorRole,
        "You do not have permission to manage doctor groups."
      );

      const normalizedName = normalizeGroupName(input.name);
      const timestamp = new Date().toISOString();
      const group: DoctorGroup = {
        id: crypto.randomUUID(),
        name: normalizedName,
        createdAt: timestamp,
        updatedAt: timestamp
      };
      const savedGroup = await dependencies.doctorGroupRepository.save(group);

      await dependencies.auditLogService.appendLog({
        actorId: input.actorId,
        actorRole: input.actorRole,
        actionType: "DOCTOR_GROUP_CREATED",
        entityType: "DOCTOR_GROUP",
        entityId: savedGroup.id,
        details: {
          name: savedGroup.name
        }
      });

      return savedGroup;
    }
  };
}
