import type {
  ActorRole,
  Doctor,
  DoctorGroup,
  EntityId,
} from "@/domain/models";
import type {
  BiasLedgerRepository,
  DoctorRepository,
  DoctorGroupRepository,
  LeaveRepository,
  OffRequestRepository,
  RosterSnapshotRepository,
  WeekdayPairBiasLedgerRepository
} from "@/domain/repositories";
import { RepositoryNotFoundError } from "@/domain/repositories";
import type { AuditLogService } from "@/features/audit/services/auditLogService";
import {
  DoctorValidationError,
  validateCreateDoctorInput,
  validateUpdateDoctorInput
} from "@/features/doctors/services/doctorManagementValidation";

export interface CreateDoctorInput {
  readonly name: string;
  readonly phoneNumber: string;
  readonly uniqueIdentifier: string;
  readonly groupId?: EntityId;
  readonly temporaryPassword: string;
  readonly actorId: EntityId;
  readonly actorRole: ActorRole;
}

export interface UpdateDoctorInput {
  readonly name: string;
  readonly phoneNumber: string;
  readonly uniqueIdentifier: string;
  readonly groupId?: EntityId;
  readonly temporaryPassword?: string;
  readonly actorId: EntityId;
  readonly actorRole: ActorRole;
}

export interface DoctorMutationActorInput {
  readonly actorId: EntityId;
  readonly actorRole: ActorRole;
}

export interface DoctorDeleteBlocker {
  readonly type:
    | "ROSTER_SNAPSHOT"
    | "LEAVE"
    | "OFF_REQUEST"
    | "BIAS_LEDGER"
    | "WEEKDAY_PAIR_BIAS_LEDGER";
  readonly count: number;
  readonly message: string;
}

export class DoctorDeleteBlockedError extends Error {
  readonly code = "RULE_VIOLATION" as const;
  readonly blockers: ReadonlyArray<DoctorDeleteBlocker>;

  constructor(blockers: ReadonlyArray<DoctorDeleteBlocker>) {
    super(
      blockers.map((blocker) => blocker.message).join(" ")
    );
    this.name = "DoctorDeleteBlockedError";
    this.blockers = blockers;
  }
}

export interface DoctorManagementService {
  listDoctors(): Promise<ReadonlyArray<Doctor>>;
  createDoctor(input: CreateDoctorInput): Promise<Doctor>;
  updateDoctor(doctorId: EntityId, input: UpdateDoctorInput): Promise<Doctor>;
  activateDoctor(
    doctorId: EntityId,
    input: DoctorMutationActorInput
  ): Promise<Doctor>;
  deactivateDoctor(
    doctorId: EntityId,
    input: DoctorMutationActorInput
  ): Promise<Doctor>;
  deleteDoctor(
    doctorId: EntityId,
    input: DoctorMutationActorInput
  ): Promise<void>;
}

export interface DoctorManagementServiceDependencies {
  readonly doctorRepository: DoctorRepository;
  readonly doctorGroupRepository: DoctorGroupRepository;
  readonly leaveRepository: LeaveRepository;
  readonly offRequestRepository: OffRequestRepository;
  readonly biasLedgerRepository: BiasLedgerRepository;
  readonly weekdayPairBiasLedgerRepository: WeekdayPairBiasLedgerRepository;
  readonly rosterSnapshotRepository: RosterSnapshotRepository;
  readonly auditLogService: AuditLogService;
}

async function appendDoctorAuditLog(
  dependencies: DoctorManagementServiceDependencies,
  input: {
    readonly actorId: EntityId;
    readonly actorRole: ActorRole;
    readonly actionType:
      | "DOCTOR_CREATED"
      | "DOCTOR_UPDATED"
      | "DOCTOR_ACTIVATED"
      | "DOCTOR_DEACTIVATED"
      | "DOCTOR_DELETED"
      | "DOCTOR_DELETE_BLOCKED"
      | "DOCTOR_GROUP_CHANGED";
    readonly doctor: Doctor;
    readonly details: Readonly<Record<string, unknown>>;
  }
) {
  await dependencies.auditLogService.appendLog({
    actorId: input.actorId,
    actorRole: input.actorRole,
    actionType: input.actionType,
    entityType: "DOCTOR",
    entityId: input.doctor.id,
    details: input.details
  });
}

async function findDoctorGroupById(
  doctorGroupRepository: DoctorGroupRepository,
  groupId: EntityId | undefined
): Promise<DoctorGroup | null> {
  if (!groupId) {
    return null;
  }

  const group = await doctorGroupRepository.findById(groupId);

  if (!group) {
    throw new DoctorValidationError(`Doctor group '${groupId}' was not found.`);
  }

  return group;
}

async function loadDoctorOrThrow(
  doctorRepository: DoctorRepository,
  doctorId: EntityId
): Promise<Doctor> {
  const doctor = await doctorRepository.findById(doctorId);

  if (!doctor) {
    throw new RepositoryNotFoundError(`Doctor '${doctorId}' was not found.`);
  }

  return doctor;
}

async function assertUniqueIdentifierAvailable(
  doctorRepository: DoctorRepository,
  uniqueIdentifier: string,
  currentDoctorId?: EntityId
): Promise<void> {
  const existingDoctor =
    await doctorRepository.findByUniqueIdentifier(uniqueIdentifier);

  if (existingDoctor && existingDoctor.id !== currentDoctorId) {
    throw new DoctorValidationError(
      `Unique ID / employee ID '${uniqueIdentifier}' is already in use.`
    );
  }
}

async function collectDoctorDeleteBlockers(
  dependencies: DoctorManagementServiceDependencies,
  doctorId: EntityId
): Promise<ReadonlyArray<DoctorDeleteBlocker>> {
  const [
    snapshots,
    leaves,
    offRequests,
    biasLedgers,
    weekdayPairBiasLedgers
  ] = await Promise.all([
    dependencies.rosterSnapshotRepository.list(),
    dependencies.leaveRepository.list({ doctorId }),
    dependencies.offRequestRepository.list({ doctorId }),
    dependencies.biasLedgerRepository.listByDoctor(doctorId),
    dependencies.weekdayPairBiasLedgerRepository.listByDoctor(doctorId)
  ]);

  const referencedSnapshots = snapshots.filter(
    (snapshot) =>
      snapshot.doctorReferences.some((reference) => reference.doctorId === doctorId) ||
      snapshot.assignments.some(
        (assignment) =>
          assignment.assignedDoctorId === doctorId ||
          assignment.actualDoctorId === doctorId ||
          assignment.fairnessOwnerDoctorId === doctorId
      )
  );

  const blockers: DoctorDeleteBlocker[] = [];

  if (referencedSnapshots.length > 0) {
    blockers.push({
      type: "ROSTER_SNAPSHOT",
      count: referencedSnapshots.length,
      message: `Doctor is referenced by ${referencedSnapshots.length} roster snapshot(s), so deletion would make history unreliable.`
    });
  }

  if (leaves.length > 0) {
    blockers.push({
      type: "LEAVE",
      count: leaves.length,
      message: `Doctor has ${leaves.length} leave record(s).`
    });
  }

  if (offRequests.length > 0) {
    blockers.push({
      type: "OFF_REQUEST",
      count: offRequests.length,
      message: `Doctor has ${offRequests.length} off-request record(s).`
    });
  }

  if (biasLedgers.length > 0) {
    blockers.push({
      type: "BIAS_LEDGER",
      count: biasLedgers.length,
      message: `Doctor has ${biasLedgers.length} primary bias ledger record(s).`
    });
  }

  if (weekdayPairBiasLedgers.length > 0) {
    blockers.push({
      type: "WEEKDAY_PAIR_BIAS_LEDGER",
      count: weekdayPairBiasLedgers.length,
      message: `Doctor has ${weekdayPairBiasLedgers.length} weekday-pair bias ledger record(s).`
    });
  }

  return blockers;
}

export function createDoctorManagementService(
  dependencies: DoctorManagementServiceDependencies
): DoctorManagementService {
  return {
    async listDoctors() {
      return dependencies.doctorRepository.list();
    },
    async createDoctor(input) {
      const normalizedInput = validateCreateDoctorInput(input);
      const group = await findDoctorGroupById(
        dependencies.doctorGroupRepository,
        normalizedInput.groupId
      );
      await assertUniqueIdentifierAvailable(
        dependencies.doctorRepository,
        normalizedInput.uniqueIdentifier
      );

      const timestamp = new Date().toISOString();

      const doctor: Doctor = {
        id: crypto.randomUUID(),
        userId: `user-${crypto.randomUUID()}`,
        name: normalizedInput.name,
        phoneNumber: normalizedInput.phoneNumber,
        uniqueIdentifier: normalizedInput.uniqueIdentifier,
        groupId: group?.id,
        isActive: true,
        createdAt: timestamp,
        updatedAt: timestamp
      };

      // TODO: Provision the user credential using temporaryPassword when auth wiring is added.
      void normalizedInput.temporaryPassword;

      const savedDoctor = await dependencies.doctorRepository.save(doctor);
      await appendDoctorAuditLog(dependencies, {
        actorId: input.actorId,
        actorRole: input.actorRole,
        actionType: "DOCTOR_CREATED",
        doctor: savedDoctor,
        details: {
          doctorName: savedDoctor.name,
          uniqueIdentifier: savedDoctor.uniqueIdentifier,
          groupId: savedDoctor.groupId ?? null,
          groupName: group?.name ?? null,
          isActive: savedDoctor.isActive,
          passwordPlaceholderProvided: normalizedInput.temporaryPassword.length > 0
        }
      });

      return savedDoctor;
    },
    async updateDoctor(doctorId, input) {
      const doctor = await loadDoctorOrThrow(dependencies.doctorRepository, doctorId);
      const normalizedInput = validateUpdateDoctorInput(input);
      const group = await findDoctorGroupById(
        dependencies.doctorGroupRepository,
        normalizedInput.groupId
      );
      await assertUniqueIdentifierAvailable(
        dependencies.doctorRepository,
        normalizedInput.uniqueIdentifier,
        doctor.id
      );

      const updatedDoctor = await dependencies.doctorRepository.save({
        ...doctor,
        name: normalizedInput.name,
        phoneNumber: normalizedInput.phoneNumber,
        uniqueIdentifier: normalizedInput.uniqueIdentifier,
        groupId: group?.id,
        updatedAt: new Date().toISOString()
      });

      const changedFields: string[] = [];
      if (doctor.name !== updatedDoctor.name) {
        changedFields.push("name");
      }

      if (doctor.phoneNumber !== updatedDoctor.phoneNumber) {
        changedFields.push("phoneNumber");
      }

      if (doctor.uniqueIdentifier !== updatedDoctor.uniqueIdentifier) {
        changedFields.push("uniqueIdentifier");
      }

      if (changedFields.length > 0) {
        await appendDoctorAuditLog(dependencies, {
          actorId: input.actorId,
          actorRole: input.actorRole,
          actionType: "DOCTOR_UPDATED",
          doctor: updatedDoctor,
          details: {
            changedFields,
            before: {
              name: doctor.name,
              phoneNumber: doctor.phoneNumber,
              uniqueIdentifier: doctor.uniqueIdentifier
            },
            after: {
              name: updatedDoctor.name,
              phoneNumber: updatedDoctor.phoneNumber,
              uniqueIdentifier: updatedDoctor.uniqueIdentifier
            },
            passwordPlaceholderProvided: normalizedInput.temporaryPassword.length > 0
          }
        });
      }

      if (doctor.groupId !== updatedDoctor.groupId) {
        const previousGroup = await findDoctorGroupById(
          dependencies.doctorGroupRepository,
          doctor.groupId
        );
        await appendDoctorAuditLog(dependencies, {
          actorId: input.actorId,
          actorRole: input.actorRole,
          actionType: "DOCTOR_GROUP_CHANGED",
          doctor: updatedDoctor,
          details: {
            previousGroupId: previousGroup?.id ?? null,
            previousGroupName: previousGroup?.name ?? null,
            nextGroupId: group?.id ?? null,
            nextGroupName: group?.name ?? null
          }
        });
      }

      return updatedDoctor;
    },
    async activateDoctor(doctorId, input) {
      const doctor = await loadDoctorOrThrow(dependencies.doctorRepository, doctorId);

      if (doctor.isActive) {
        return doctor;
      }

      const updatedDoctor = await dependencies.doctorRepository.save({
        ...doctor,
        isActive: true,
        updatedAt: new Date().toISOString()
      });

      await appendDoctorAuditLog(dependencies, {
        actorId: input.actorId,
        actorRole: input.actorRole,
        actionType: "DOCTOR_ACTIVATED",
        doctor: updatedDoctor,
        details: {
          previousStatus: "INACTIVE",
          nextStatus: "ACTIVE"
        }
      });

      return updatedDoctor;
    },
    async deactivateDoctor(doctorId, input) {
      const doctor = await loadDoctorOrThrow(dependencies.doctorRepository, doctorId);

      if (!doctor.isActive) {
        return doctor;
      }

      const updatedDoctor = await dependencies.doctorRepository.save({
        ...doctor,
        isActive: false,
        updatedAt: new Date().toISOString()
      });

      await appendDoctorAuditLog(dependencies, {
        actorId: input.actorId,
        actorRole: input.actorRole,
        actionType: "DOCTOR_DEACTIVATED",
        doctor: updatedDoctor,
        details: {
          previousStatus: "ACTIVE",
          nextStatus: "INACTIVE"
        }
      });

      return updatedDoctor;
    },
    async deleteDoctor(doctorId, input) {
      const doctor = await loadDoctorOrThrow(dependencies.doctorRepository, doctorId);
      const blockers = await collectDoctorDeleteBlockers(dependencies, doctor.id);

      if (blockers.length > 0) {
        await appendDoctorAuditLog(dependencies, {
          actorId: input.actorId,
          actorRole: input.actorRole,
          actionType: "DOCTOR_DELETE_BLOCKED",
          doctor,
          details: {
            blockerTypes: blockers.map((blocker) => blocker.type),
            blockers
          }
        });

        throw new DoctorDeleteBlockedError(blockers);
      }

      await dependencies.doctorRepository.delete(doctorId);
      await appendDoctorAuditLog(dependencies, {
        actorId: input.actorId,
        actorRole: input.actorRole,
        actionType: "DOCTOR_DELETED",
        doctor,
        details: {
          doctorName: doctor.name,
          uniqueIdentifier: doctor.uniqueIdentifier
        }
      });
    }
  };
}
