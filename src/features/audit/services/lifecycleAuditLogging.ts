import type {
  ActorRole,
  DutyDesign,
  DutyDesignAssignment,
  EntityId,
  RosterWizardDraft,
  RosterSnapshot,
  ShiftType
} from "@/domain/models";
import type { AuditActionType, AuditLogDetails } from "@/domain/models/AuditLog";
import type { AuditLogService } from "@/features/audit/services/auditLogService";

interface LifecycleActorInput {
  readonly actorId: EntityId;
  readonly actorRole: ActorRole;
  readonly correlationId?: string;
}

function cloneDutyDesign(dutyDesign: DutyDesign): DutyDesign {
  return {
    ...dutyDesign,
    dutyBlocks: dutyDesign.dutyBlocks.map((block) => ({ ...block }))
  };
}

function cloneDutyDesignAssignmentsMap(
  assignments: RosterSnapshot["generatedInputSummary"]["dutyDesignAssignments"]
): RosterSnapshot["generatedInputSummary"]["dutyDesignAssignments"] {
  return Object.fromEntries(
    Object.entries(assignments).map(([date, entry]) => [
      date,
      {
        standardDesignId: entry.standardDesignId,
        holidayOverrideDesignId: entry.holidayOverrideDesignId
      }
    ])
  );
}

function cloneDutyDesignSnapshot(
  dutyDesignSnapshot: RosterSnapshot["generatedInputSummary"]["dutyDesignSnapshot"]
): RosterSnapshot["generatedInputSummary"]["dutyDesignSnapshot"] {
  return Object.fromEntries(
    Object.entries(dutyDesignSnapshot).map(([designId, dutyDesign]) => [
      designId,
      cloneDutyDesign(dutyDesign)
    ])
  );
}

function cloneDoctorGroupSnapshot(
  doctorGroupSnapshot: RosterSnapshot["generatedInputSummary"]["doctorGroupSnapshot"]
): RosterSnapshot["generatedInputSummary"]["doctorGroupSnapshot"] {
  return Object.fromEntries(
    Object.entries(doctorGroupSnapshot).map(([groupId, group]) => [groupId, { ...group }])
  );
}

function cloneAllowedDoctorGroupIdByDate(
  allowedDoctorGroupIdByDate: RosterSnapshot["generatedInputSummary"]["allowedDoctorGroupIdByDate"]
): RosterSnapshot["generatedInputSummary"]["allowedDoctorGroupIdByDate"] {
  return Object.fromEntries(Object.entries(allowedDoctorGroupIdByDate));
}

function countDutyDesignAssignments(
  assignments: RosterSnapshot["generatedInputSummary"]["dutyDesignAssignments"]
): number {
  return Object.values(assignments).reduce((count, entry) => {
    if (entry.standardDesignId) {
      count += 1;
    }

    if (entry.holidayOverrideDesignId) {
      count += 1;
    }

    return count;
  }, 0);
}

async function appendLifecycleAuditLog(input: {
  readonly auditLogService: AuditLogService;
  readonly actorId: EntityId;
  readonly actorRole: ActorRole;
  readonly actionType: AuditActionType;
  readonly entityType: Parameters<AuditLogService["appendLog"]>[0]["entityType"];
  readonly entityId: EntityId;
  readonly details: AuditLogDetails;
  readonly correlationId?: string;
}): Promise<void> {
  await input.auditLogService.appendLog({
    actorId: input.actorId,
    actorRole: input.actorRole,
    actionType: input.actionType,
    entityType: input.entityType,
    entityId: input.entityId,
    details: input.details,
    correlationId: input.correlationId
  });
}

export async function logShiftTypeCreated(
  auditLogService: AuditLogService,
  input: LifecycleActorInput & {
    readonly shiftType: ShiftType;
    readonly details: Readonly<Record<string, unknown>>;
  }
): Promise<void> {
  await appendLifecycleAuditLog({
    auditLogService,
    actorId: input.actorId,
    actorRole: input.actorRole,
    actionType: "SHIFT_TYPE_CREATED",
    entityType: "SHIFT_TYPE",
    entityId: input.shiftType.id,
    details: input.details,
    correlationId: input.correlationId
  });
}

export async function logShiftTypeUpdated(
  auditLogService: AuditLogService,
  input: LifecycleActorInput & {
    readonly shiftType: ShiftType;
    readonly details: Readonly<Record<string, unknown>>;
  }
): Promise<void> {
  await appendLifecycleAuditLog({
    auditLogService,
    actorId: input.actorId,
    actorRole: input.actorRole,
    actionType: "SHIFT_TYPE_UPDATED",
    entityType: "SHIFT_TYPE",
    entityId: input.shiftType.id,
    details: input.details,
    correlationId: input.correlationId
  });
}

export async function logShiftTypeActivated(
  auditLogService: AuditLogService,
  input: LifecycleActorInput & {
    readonly shiftType: ShiftType;
    readonly details: Readonly<Record<string, unknown>>;
  }
): Promise<void> {
  await appendLifecycleAuditLog({
    auditLogService,
    actorId: input.actorId,
    actorRole: input.actorRole,
    actionType: "SHIFT_TYPE_ACTIVATED",
    entityType: "SHIFT_TYPE",
    entityId: input.shiftType.id,
    details: input.details,
    correlationId: input.correlationId
  });
}

export async function logShiftTypeDeactivated(
  auditLogService: AuditLogService,
  input: LifecycleActorInput & {
    readonly shiftType: ShiftType;
    readonly details: Readonly<Record<string, unknown>>;
  }
): Promise<void> {
  await appendLifecycleAuditLog({
    auditLogService,
    actorId: input.actorId,
    actorRole: input.actorRole,
    actionType: "SHIFT_TYPE_DEACTIVATED",
    entityType: "SHIFT_TYPE",
    entityId: input.shiftType.id,
    details: input.details,
    correlationId: input.correlationId
  });
}

export async function logShiftTypeDeleteBlocked(
  auditLogService: AuditLogService,
  input: LifecycleActorInput & {
    readonly shiftType: ShiftType;
    readonly details: Readonly<Record<string, unknown>>;
  }
): Promise<void> {
  await appendLifecycleAuditLog({
    auditLogService,
    actorId: input.actorId,
    actorRole: input.actorRole,
    actionType: "SHIFT_TYPE_DELETE_BLOCKED",
    entityType: "SHIFT_TYPE",
    entityId: input.shiftType.id,
    details: input.details,
    correlationId: input.correlationId
  });
}

export async function logShiftTypeDeleted(
  auditLogService: AuditLogService,
  input: LifecycleActorInput & {
    readonly shiftType: ShiftType;
    readonly details: Readonly<Record<string, unknown>>;
  }
): Promise<void> {
  await appendLifecycleAuditLog({
    auditLogService,
    actorId: input.actorId,
    actorRole: input.actorRole,
    actionType: "SHIFT_TYPE_DELETED",
    entityType: "SHIFT_TYPE",
    entityId: input.shiftType.id,
    details: input.details,
    correlationId: input.correlationId
  });
}

export async function logDutyDesignCreated(
  auditLogService: AuditLogService,
  input: LifecycleActorInput & {
    readonly dutyDesign: DutyDesign;
    readonly details: Readonly<Record<string, unknown>>;
  }
): Promise<void> {
  await appendLifecycleAuditLog({
    auditLogService,
    actorId: input.actorId,
    actorRole: input.actorRole,
    actionType: "DUTY_DESIGN_CREATED",
    entityType: "DUTY_DESIGN",
    entityId: input.dutyDesign.id,
    details: input.details,
    correlationId: input.correlationId
  });
}

export async function logDutyDesignUpdated(
  auditLogService: AuditLogService,
  input: LifecycleActorInput & {
    readonly dutyDesign: DutyDesign;
    readonly details: Readonly<Record<string, unknown>>;
  }
): Promise<void> {
  await appendLifecycleAuditLog({
    auditLogService,
    actorId: input.actorId,
    actorRole: input.actorRole,
    actionType: "DUTY_DESIGN_UPDATED",
    entityType: "DUTY_DESIGN",
    entityId: input.dutyDesign.id,
    details: input.details,
    correlationId: input.correlationId
  });
}

export async function logDutyDesignActivated(
  auditLogService: AuditLogService,
  input: LifecycleActorInput & {
    readonly dutyDesign: DutyDesign;
    readonly details: Readonly<Record<string, unknown>>;
  }
): Promise<void> {
  await appendLifecycleAuditLog({
    auditLogService,
    actorId: input.actorId,
    actorRole: input.actorRole,
    actionType: "DUTY_DESIGN_ACTIVATED",
    entityType: "DUTY_DESIGN",
    entityId: input.dutyDesign.id,
    details: input.details,
    correlationId: input.correlationId
  });
}

export async function logDutyDesignDeactivated(
  auditLogService: AuditLogService,
  input: LifecycleActorInput & {
    readonly dutyDesign: DutyDesign;
    readonly details: Readonly<Record<string, unknown>>;
  }
): Promise<void> {
  await appendLifecycleAuditLog({
    auditLogService,
    actorId: input.actorId,
    actorRole: input.actorRole,
    actionType: "DUTY_DESIGN_DEACTIVATED",
    entityType: "DUTY_DESIGN",
    entityId: input.dutyDesign.id,
    details: input.details,
    correlationId: input.correlationId
  });
}

export async function logDutyDesignDeleteBlocked(
  auditLogService: AuditLogService,
  input: LifecycleActorInput & {
    readonly dutyDesign: DutyDesign;
    readonly details: Readonly<Record<string, unknown>>;
  }
): Promise<void> {
  await appendLifecycleAuditLog({
    auditLogService,
    actorId: input.actorId,
    actorRole: input.actorRole,
    actionType: "DUTY_DESIGN_DELETE_BLOCKED",
    entityType: "DUTY_DESIGN",
    entityId: input.dutyDesign.id,
    details: input.details,
    correlationId: input.correlationId
  });
}

export async function logDutyDesignDeleted(
  auditLogService: AuditLogService,
  input: LifecycleActorInput & {
    readonly dutyDesign: DutyDesign;
    readonly details: Readonly<Record<string, unknown>>;
  }
): Promise<void> {
  await appendLifecycleAuditLog({
    auditLogService,
    actorId: input.actorId,
    actorRole: input.actorRole,
    actionType: "DUTY_DESIGN_DELETED",
    entityType: "DUTY_DESIGN",
    entityId: input.dutyDesign.id,
    details: input.details,
    correlationId: input.correlationId
  });
}

export async function logDutyDesignAssignmentCreated(
  auditLogService: AuditLogService,
  input: LifecycleActorInput & {
    readonly assignment: DutyDesignAssignment;
    readonly details: Readonly<Record<string, unknown>>;
  }
): Promise<void> {
  await appendLifecycleAuditLog({
    auditLogService,
    actorId: input.actorId,
    actorRole: input.actorRole,
    actionType: "DUTY_DESIGN_ASSIGNED",
    entityType: "DUTY_DESIGN_ASSIGNMENT",
    entityId: input.assignment.id,
    details: input.details,
    correlationId: input.correlationId
  });
}

export async function logDutyDesignAssignmentUpdated(
  auditLogService: AuditLogService,
  input: LifecycleActorInput & {
    readonly assignment: DutyDesignAssignment;
    readonly details: Readonly<Record<string, unknown>>;
  }
): Promise<void> {
  await appendLifecycleAuditLog({
    auditLogService,
    actorId: input.actorId,
    actorRole: input.actorRole,
    actionType: "DUTY_DESIGN_ASSIGNMENT_UPDATED",
    entityType: "DUTY_DESIGN_ASSIGNMENT",
    entityId: input.assignment.id,
    details: input.details,
    correlationId: input.correlationId
  });
}

export async function logDutyDesignAssignmentDeleted(
  auditLogService: AuditLogService,
  input: LifecycleActorInput & {
    readonly assignment: DutyDesignAssignment;
    readonly details: Readonly<Record<string, unknown>>;
  }
): Promise<void> {
  await appendLifecycleAuditLog({
    auditLogService,
    actorId: input.actorId,
    actorRole: input.actorRole,
    actionType: "DUTY_DESIGN_UNASSIGNED",
    entityType: "DUTY_DESIGN_ASSIGNMENT",
    entityId: input.assignment.id,
    details: input.details,
    correlationId: input.correlationId
  });
}

function buildRosterLifecycleDetails(snapshot: RosterSnapshot): AuditLogDetails {
  const activeBiasCriteria =
    snapshot.generatedInputSummary.activeBiasCriteria.map((criteria) => ({
      id: criteria.id,
      code: criteria.code,
      label: criteria.label,
      locationIds: [...criteria.locationIds],
      shiftTypeIds: [...criteria.shiftTypeIds],
      weekdayConditions: [...criteria.weekdayConditions],
      isWeekendOnly: criteria.isWeekendOnly,
      isActive: criteria.isActive
    }));
  const activeDutyLocations =
    snapshot.generatedInputSummary.activeDutyLocations.map((location) => ({
      id: location.id,
      code: location.code,
      label: location.label,
      isActive: location.isActive
    }));

  return {
    rosterMonth: snapshot.generatedInputSummary.rosterMonth,
    status: snapshot.roster.status,
    warningCount: snapshot.warnings.length,
    validationPassed: snapshot.validation.isValid,
    derivedFromRosterId: snapshot.derivedFromRosterId ?? null,
    activeCriteriaCount: activeBiasCriteria.length,
    activeBiasCriteria,
    activeDutyLocationCount: activeDutyLocations.length,
    activeDutyLocations,
    fallbackLocationId: snapshot.generatedInputSummary.fallbackLocationId,
    doctorGroupCount: Object.keys(snapshot.generatedInputSummary.doctorGroupSnapshot).length,
    allowedDoctorGroupConstraintCount: Object.keys(
      snapshot.generatedInputSummary.allowedDoctorGroupIdByDate
    ).length,
    dutyDesignSnapshotCount: Object.keys(
      snapshot.generatedInputSummary.dutyDesignSnapshot
    ).length,
    dutyDesignAssignmentCount: countDutyDesignAssignments(
      snapshot.generatedInputSummary.dutyDesignAssignments
    ),
    publicHolidayDateCount: snapshot.generatedInputSummary.publicHolidayDates.length
  };
}

export async function logRosterGeneratedWithDutyDesign(
  auditLogService: AuditLogService,
  input: LifecycleActorInput & {
    readonly snapshot: RosterSnapshot;
    readonly extraDetails?: Readonly<Record<string, unknown>>;
  }
): Promise<void> {
  await appendLifecycleAuditLog({
    auditLogService,
    actorId: input.actorId,
    actorRole: input.actorRole,
    actionType: "ROSTER_GENERATED",
    entityType: "ROSTER",
    entityId: input.snapshot.roster.id,
    details: {
      ...buildRosterLifecycleDetails(input.snapshot),
      doctorGroupSnapshot: cloneDoctorGroupSnapshot(
        input.snapshot.generatedInputSummary.doctorGroupSnapshot
      ),
      allowedDoctorGroupIdByDate: cloneAllowedDoctorGroupIdByDate(
        input.snapshot.generatedInputSummary.allowedDoctorGroupIdByDate
      ),
      dutyDesignAssignments: cloneDutyDesignAssignmentsMap(
        input.snapshot.generatedInputSummary.dutyDesignAssignments
      ),
      dutyDesignSnapshot: cloneDutyDesignSnapshot(
        input.snapshot.generatedInputSummary.dutyDesignSnapshot
      ),
      ...input.extraDetails
    }
  });
}

export async function logRosterLifecycleEvent(
  auditLogService: AuditLogService,
  input: LifecycleActorInput & {
    readonly actionType:
      | "ROSTER_PUBLISHED"
      | "ROSTER_LOCKED"
      | "ROSTER_UNLOCKED"
      | "ROSTER_DELETED"
      | "ROSTER_DELETE_BLOCKED";
    readonly snapshot: RosterSnapshot;
    readonly extraDetails?: Readonly<Record<string, unknown>>;
  }
): Promise<void> {
  await appendLifecycleAuditLog({
    auditLogService,
    actorId: input.actorId,
    actorRole: input.actorRole,
    actionType: input.actionType,
    entityType: "ROSTER",
    entityId: input.snapshot.roster.id,
    details: {
      ...buildRosterLifecycleDetails(input.snapshot),
      ...input.extraDetails
    }
  });
}

function buildRosterWizardDraftDetails(
  draft: RosterWizardDraft
): AuditLogDetails {
  return {
    name: draft.name,
    rosterMonth: draft.rosterMonth,
    currentStep: draft.currentStep,
    status: draft.status,
    publicHolidayDateCount: draft.publicHolidayDates.length,
    groupConstraintTemplateCount: draft.groupConstraintTemplateIds.length,
    groupConstraintCount: draft.groupConstraints.length,
    excludedDoctorPeriodCount: draft.excludedDoctorPeriods.length,
    dutyDesignAssignmentCount: draft.dutyDesignAssignments.length,
    manualShiftAssignmentCount: draft.manualShiftAssignments.length,
    currentBiasLedgerCount: draft.currentBiasSnapshot.length
  };
}

export async function logRosterWizardDraftLifecycleEvent(
  auditLogService: AuditLogService,
  input: LifecycleActorInput & {
    readonly actionType:
      | "ROSTER_WIZARD_DRAFT_CREATED"
      | "ROSTER_WIZARD_DRAFT_UPDATED"
      | "ROSTER_WIZARD_DRAFT_PUBLISHED"
      | "ROSTER_WIZARD_DRAFT_LOCKED"
      | "ROSTER_WIZARD_DRAFT_UNLOCKED"
      | "ROSTER_WIZARD_DRAFT_DELETED";
    readonly draft: RosterWizardDraft;
    readonly extraDetails?: Readonly<Record<string, unknown>>;
  }
): Promise<void> {
  await appendLifecycleAuditLog({
    auditLogService,
    actorId: input.actorId,
    actorRole: input.actorRole,
    actionType: input.actionType,
    entityType: "ROSTER_WIZARD_DRAFT",
    entityId: input.draft.id,
    details: {
      ...buildRosterWizardDraftDetails(input.draft),
      ...input.extraDetails
    },
    correlationId: input.correlationId
  });
}
