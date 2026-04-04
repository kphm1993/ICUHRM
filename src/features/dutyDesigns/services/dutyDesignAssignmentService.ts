import type {
  ActorRole,
  DutyDesignAssignment,
  EntityId,
  ISODateString,
  RosterPeriod
} from "@/domain/models";
import type {
  DutyDesignAssignmentRepository,
  DutyDesignRepository
} from "@/domain/repositories";
import { RepositoryNotFoundError } from "@/domain/repositories";
import { assertAdminActorRole } from "@/features/admin/services/assertAdminActorRole";
import type { AuditLogService } from "@/features/audit/services/auditLogService";
import {
  logDutyDesignAssignmentCreated,
  logDutyDesignAssignmentDeleted,
  logDutyDesignAssignmentUpdated
} from "@/features/audit/services/lifecycleAuditLogging";

export interface DutyDesignAssignmentActorInput {
  readonly actorId: EntityId;
  readonly actorRole: ActorRole;
}

export interface AssignDutyDesignInput extends DutyDesignAssignmentActorInput {
  readonly date: ISODateString;
  readonly dutyDesignId: EntityId;
  readonly isHolidayOverride: boolean;
  readonly correlationId?: string;
  readonly batchDateCount?: number;
}

export interface UpdateDutyDesignAssignmentInput
  extends DutyDesignAssignmentActorInput {
  readonly assignmentId: EntityId;
  readonly date: ISODateString;
  readonly dutyDesignId: EntityId;
  readonly isHolidayOverride: boolean;
}

export interface DutyDesignAssignmentService {
  assignDutyDesign(input: AssignDutyDesignInput): Promise<DutyDesignAssignment>;
  updateDutyDesignAssignment(
    input: UpdateDutyDesignAssignmentInput
  ): Promise<DutyDesignAssignment>;
  unassignDutyDesign(
    input: DutyDesignAssignmentActorInput & { readonly assignmentId: EntityId }
  ): Promise<void>;
  listAssignmentsByMonth(period: RosterPeriod): Promise<ReadonlyArray<DutyDesignAssignment>>;
}

export interface DutyDesignAssignmentServiceDependencies {
  readonly dutyDesignAssignmentRepository: DutyDesignAssignmentRepository;
  readonly dutyDesignRepository: DutyDesignRepository;
  readonly auditLogService: AuditLogService;
}

async function assertDutyDesignIsAssignable(
  dutyDesignRepository: DutyDesignRepository,
  dutyDesignId: EntityId
): Promise<void> {
  const dutyDesign = await dutyDesignRepository.getById(dutyDesignId);

  if (!dutyDesign) {
    throw new RepositoryNotFoundError(
      `Duty design '${dutyDesignId}' was not found.`
    );
  }

  if (!dutyDesign.isActive) {
    throw new Error(
      `Duty design '${dutyDesign.label}' must be active before it can be assigned to roster dates.`
    );
  }
}

function assertAssignmentInputIsValid(input: AssignDutyDesignInput): void {
  if (input.date.trim().length === 0) {
    throw new Error("Assignment date is required.");
  }
}

async function loadAssignmentOrThrow(
  dutyDesignAssignmentRepository: DutyDesignAssignmentRepository,
  assignmentId: EntityId
): Promise<DutyDesignAssignment> {
  const assignment = await dutyDesignAssignmentRepository.getById(assignmentId);

  if (!assignment) {
    throw new RepositoryNotFoundError(
      `Duty design assignment '${assignmentId}' was not found.`
    );
  }

  return assignment;
}

export function createDutyDesignAssignmentService(
  dependencies: DutyDesignAssignmentServiceDependencies
): DutyDesignAssignmentService {
  return {
    async assignDutyDesign(input) {
      assertAdminActorRole(
        input.actorRole,
        "Only admins can manage duty design assignments."
      );
      assertAssignmentInputIsValid(input);
      await assertDutyDesignIsAssignable(
        dependencies.dutyDesignRepository,
        input.dutyDesignId
      );
      const timestamp = new Date().toISOString();

      const assignment = await dependencies.dutyDesignAssignmentRepository.create({
        id: crypto.randomUUID(),
        date: input.date,
        dutyDesignId: input.dutyDesignId,
        isHolidayOverride: input.isHolidayOverride,
        createdAt: timestamp,
        updatedAt: timestamp
      });

      await logDutyDesignAssignmentCreated(dependencies.auditLogService, {
        assignment,
        actorId: input.actorId,
        actorRole: input.actorRole,
        correlationId: input.correlationId,
        details: {
          date: assignment.date,
          dutyDesignId: assignment.dutyDesignId,
          isHolidayOverride: assignment.isHolidayOverride,
          batchDateCount: input.batchDateCount ?? 1
        }
      });

      return assignment;
    },
    async updateDutyDesignAssignment(input) {
      assertAdminActorRole(
        input.actorRole,
        "Only admins can manage duty design assignments."
      );
      assertAssignmentInputIsValid(input);
      const existingAssignment = await loadAssignmentOrThrow(
        dependencies.dutyDesignAssignmentRepository,
        input.assignmentId
      );
      await assertDutyDesignIsAssignable(
        dependencies.dutyDesignRepository,
        input.dutyDesignId
      );

      const updatedAssignment =
        await dependencies.dutyDesignAssignmentRepository.update(
          existingAssignment.id,
          {
            date: input.date,
            dutyDesignId: input.dutyDesignId,
            isHolidayOverride: input.isHolidayOverride,
            updatedAt: new Date().toISOString()
          }
        );
      const changedFields: string[] = [];

      if (existingAssignment.date !== updatedAssignment.date) {
        changedFields.push("date");
      }
      if (existingAssignment.dutyDesignId !== updatedAssignment.dutyDesignId) {
        changedFields.push("dutyDesignId");
      }
      if (
        existingAssignment.isHolidayOverride !== updatedAssignment.isHolidayOverride
      ) {
        changedFields.push("isHolidayOverride");
      }

      await logDutyDesignAssignmentUpdated(dependencies.auditLogService, {
        assignment: updatedAssignment,
        actorId: input.actorId,
        actorRole: input.actorRole,
        details: {
          changedFields,
          before: {
            date: existingAssignment.date,
            dutyDesignId: existingAssignment.dutyDesignId,
            isHolidayOverride: existingAssignment.isHolidayOverride
          },
          after: {
            date: updatedAssignment.date,
            dutyDesignId: updatedAssignment.dutyDesignId,
            isHolidayOverride: updatedAssignment.isHolidayOverride
          }
        }
      });

      return updatedAssignment;
    },
    async unassignDutyDesign(input) {
      assertAdminActorRole(
        input.actorRole,
        "Only admins can manage duty design assignments."
      );
      const assignment = await loadAssignmentOrThrow(
        dependencies.dutyDesignAssignmentRepository,
        input.assignmentId
      );

      await dependencies.dutyDesignAssignmentRepository.delete(input.assignmentId);
      await logDutyDesignAssignmentDeleted(dependencies.auditLogService, {
        assignment,
        actorId: input.actorId,
        actorRole: input.actorRole,
        details: {
          date: assignment.date,
          dutyDesignId: assignment.dutyDesignId,
          isHolidayOverride: assignment.isHolidayOverride
        }
      });
    },
    async listAssignmentsByMonth(period) {
      return dependencies.dutyDesignAssignmentRepository.listByMonth(period);
    }
  };
}
