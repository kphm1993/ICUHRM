import type {
  ActorRole,
  BiasCriteria,
  BiasLedger,
  Doctor,
  DutyLocation,
  EntityId,
  Leave,
  OffRequest,
  Roster,
  RosterPeriod,
  RosterSnapshot,
  ShiftType,
  WeekdayPairBiasLedger,
  WeekendGroup,
  WeekendGroupScheduleEntry,
  YearMonthString
} from "@/domain/models";
import type {
  BiasLedgerRepository,
  RosterSnapshotRepository,
  WeekdayPairBiasLedgerRepository
} from "@/domain/repositories";
import {
  RepositoryNotFoundError,
  RosterDeletionError,
  UnauthorizedError
} from "@/domain/repositories";
import { generateRoster } from "@/domain/scheduling";
import type { BiasCriteriaManagementService } from "@/features/admin/services/biasCriteriaManagementService";
import type { DutyLocationManagementService } from "@/features/admin/services/dutyLocationManagementService";
import type { AuditLogService } from "@/features/audit/services/auditLogService";
import type { DoctorManagementService } from "@/features/doctors/services/doctorManagementService";
import type { BiasManagementService } from "@/features/fairness/services/biasManagementService";
import type { LeaveManagementService } from "@/features/leaves/services/leaveManagementService";
import type { OffRequestService } from "@/features/offRequests/services/offRequestService";
import {
  buildWeekendGroupScheduleForMonth,
  getRosterMonthRange
} from "@/features/roster/services/weekendGroupScheduleService";
import type { ShiftTypeManagementService } from "@/features/shifts/services/shiftTypeManagementService";

export interface RosterMonthContext {
  readonly rosterMonth: YearMonthString;
  readonly range: RosterPeriod;
  readonly firstWeekendOffGroup: WeekendGroup;
  readonly weekendGroupSchedule: ReadonlyArray<WeekendGroupScheduleEntry>;
  readonly activeDoctors: ReadonlyArray<Doctor>;
  readonly leaves: ReadonlyArray<Leave>;
  readonly offRequests: ReadonlyArray<OffRequest>;
  readonly shiftTypes: ReadonlyArray<ShiftType>;
  readonly currentBias: ReadonlyArray<BiasLedger>;
  readonly currentWeekdayPairBias: ReadonlyArray<WeekdayPairBiasLedger>;
  readonly activeBiasCriteria: ReadonlyArray<BiasCriteria>;
  readonly activeDutyLocations: ReadonlyArray<DutyLocation>;
  readonly sourceSummary: RosterSnapshot["generatedInputSummary"];
  readonly snapshots: ReadonlyArray<RosterSnapshot>;
  readonly latestDraft: RosterSnapshot | null;
  readonly latestPublished: RosterSnapshot | null;
  readonly latestLocked: RosterSnapshot | null;
  readonly activeOfficial: RosterSnapshot | null;
}

export interface GetRosterMonthContextInput {
  readonly rosterMonth: YearMonthString;
  readonly firstWeekendOffGroup?: WeekendGroup;
}

export interface GenerateDraftRosterInput {
  readonly rosterMonth: YearMonthString;
  readonly firstWeekendOffGroup: WeekendGroup;
  readonly notes?: string;
  readonly actorId: EntityId;
  readonly actorRole: ActorRole;
}

export interface PublishDraftRosterInput {
  readonly draftRosterId: EntityId;
  readonly actorId: EntityId;
  readonly actorRole: ActorRole;
}

export interface LockPublishedRosterInput {
  readonly publishedRosterId: EntityId;
  readonly actorId: EntityId;
  readonly actorRole: ActorRole;
}

export interface UnlockLockedRosterInput {
  readonly lockedRosterId: EntityId;
  readonly actorId: EntityId;
  readonly actorRole: ActorRole;
}

export interface DeleteRosterInput {
  readonly rosterId: EntityId;
  readonly actorId: EntityId;
  readonly actorRole: ActorRole;
}

export interface RosterWorkflowService {
  getMonthContext(input: GetRosterMonthContextInput): Promise<RosterMonthContext>;
  generateDraft(input: GenerateDraftRosterInput): Promise<RosterSnapshot>;
  publishDraft(input: PublishDraftRosterInput): Promise<RosterSnapshot>;
  lockPublishedRoster(input: LockPublishedRosterInput): Promise<RosterSnapshot>;
  unlockLockedRoster(input: UnlockLockedRosterInput): Promise<RosterSnapshot>;
  deleteRoster(input: DeleteRosterInput): Promise<void>;
}

export interface RosterWorkflowServiceDependencies {
  readonly biasCriteriaManagementService: BiasCriteriaManagementService;
  readonly doctorManagementService: DoctorManagementService;
  readonly dutyLocationManagementService: DutyLocationManagementService;
  readonly leaveManagementService: LeaveManagementService;
  readonly shiftTypeManagementService: ShiftTypeManagementService;
  readonly offRequestService: OffRequestService;
  readonly biasManagementService: BiasManagementService;
  readonly biasLedgerRepository: BiasLedgerRepository;
  readonly weekdayPairBiasLedgerRepository: WeekdayPairBiasLedgerRepository;
  readonly rosterSnapshotRepository: RosterSnapshotRepository;
  readonly auditLogService: AuditLogService;
}

function buildRosterDoctorReferences(doctors: ReadonlyArray<Doctor>) {
  return doctors.map((doctor) => ({
    doctorId: doctor.id,
    name: doctor.name,
    uniqueIdentifier: doctor.uniqueIdentifier,
    weekendGroup: doctor.weekendGroup,
    isActive: doctor.isActive
  }));
}

function findLatestSnapshotByStatus(
  snapshots: ReadonlyArray<RosterSnapshot>,
  status: Roster["status"]
): RosterSnapshot | null {
  return snapshots.find((snapshot) => snapshot.roster.status === status) ?? null;
}

function filterDeletedSnapshots(
  snapshots: ReadonlyArray<RosterSnapshot>
): ReadonlyArray<RosterSnapshot> {
  return snapshots.filter((snapshot) => !snapshot.roster.isDeleted);
}

function findActiveOfficialSnapshot(
  snapshots: ReadonlyArray<RosterSnapshot>
): RosterSnapshot | null {
  return (
    findLatestSnapshotByStatus(snapshots, "LOCKED") ??
    findLatestSnapshotByStatus(snapshots, "PUBLISHED")
  );
}

function buildGeneratedInputSummary(input: {
  readonly rosterMonth: YearMonthString;
  readonly range: RosterPeriod;
  readonly firstWeekendOffGroup: WeekendGroup;
  readonly weekendGroupSchedule: ReadonlyArray<WeekendGroupScheduleEntry>;
  readonly activeDoctors: ReadonlyArray<Doctor>;
  readonly leaves: ReadonlyArray<Leave>;
  readonly offRequests: ReadonlyArray<OffRequest>;
  readonly shiftTypes: ReadonlyArray<ShiftType>;
  readonly activeBiasCriteria: ReadonlyArray<BiasCriteria>;
  readonly activeDutyLocations: ReadonlyArray<DutyLocation>;
}): RosterSnapshot["generatedInputSummary"] {
  return {
    rosterMonth: input.rosterMonth,
    range: input.range,
    activeDoctorCount: input.activeDoctors.length,
    leaveCount: input.leaves.length,
    offRequestCount: input.offRequests.length,
    shiftTypeCount: input.shiftTypes.length,
    firstWeekendOffGroup: input.firstWeekendOffGroup,
    weekendGroupSchedule: input.weekendGroupSchedule,
    activeBiasCriteria: input.activeBiasCriteria.map((criteria) => ({
      ...criteria,
      locationIds: [...criteria.locationIds],
      shiftTypeIds: [...criteria.shiftTypeIds],
      weekdayConditions: [...criteria.weekdayConditions]
    })),
    activeDutyLocations: input.activeDutyLocations.map((location) => ({
      ...location
    }))
  };
}

function cloneShiftIdsForNewRoster(snapshot: RosterSnapshot, nextRosterId: EntityId) {
  const shiftIdMap = new Map<EntityId, EntityId>();
  const shifts = snapshot.shifts.map((shift) => {
    const nextShiftId = `${nextRosterId}:${shift.date}:${shift.definitionSnapshot.code.toLowerCase()}`;
    shiftIdMap.set(shift.id, nextShiftId);

    return {
      ...shift,
      id: nextShiftId,
      rosterId: nextRosterId,
      definitionSnapshot: { ...shift.definitionSnapshot }
    };
  });

  return { shifts, shiftIdMap };
}

function cloneAssignmentsForNewRoster(
  snapshot: RosterSnapshot,
  nextRosterId: EntityId,
  shiftIdMap: ReadonlyMap<EntityId, EntityId>
) {
  return snapshot.assignments.map((assignment) => {
    const nextShiftId = shiftIdMap.get(assignment.shiftId) ?? assignment.shiftId;

    return {
      ...assignment,
      id: `${nextShiftId}:assignment`,
      rosterId: nextRosterId,
      shiftId: nextShiftId
    };
  });
}

function createLifecycleSnapshot(
  sourceSnapshot: RosterSnapshot,
  status: Roster["status"],
  actorId: EntityId
): RosterSnapshot {
  const timestamp = new Date().toISOString();
  const nextRosterId = crypto.randomUUID();
  const { shifts, shiftIdMap } = cloneShiftIdsForNewRoster(sourceSnapshot, nextRosterId);
  const assignments = cloneAssignmentsForNewRoster(
    sourceSnapshot,
    nextRosterId,
    shiftIdMap
  );

  return {
    roster: {
      ...sourceSnapshot.roster,
      id: nextRosterId,
      status,
      createdAt: timestamp,
      createdByUserId: actorId,
      generatedAt: sourceSnapshot.roster.generatedAt,
      publishedAt:
        status === "PUBLISHED"
          ? timestamp
          : sourceSnapshot.roster.publishedAt,
      lockedAt: status === "LOCKED" ? timestamp : undefined,
      weekendGroupSchedule: sourceSnapshot.roster.weekendGroupSchedule.map((entry) => ({
        ...entry
      }))
    },
    doctorReferences: sourceSnapshot.doctorReferences.map((reference) => ({
      ...reference
    })),
    shifts,
    assignments,
    warnings: [...sourceSnapshot.warnings],
    validation: {
      isValid: sourceSnapshot.validation.isValid,
      issues: sourceSnapshot.validation.issues.map((issue) => ({ ...issue }))
    },
    updatedBias: sourceSnapshot.updatedBias.map((entry) => ({
      ...entry,
      balances: { ...entry.balances },
      sourceReferenceId: nextRosterId
    })),
    updatedWeekdayPairBias: sourceSnapshot.updatedWeekdayPairBias?.map((entry) => ({
      ...entry,
      balance: { ...entry.balance },
      sourceReferenceId: nextRosterId
    })),
    derivedFromRosterId: sourceSnapshot.roster.id,
    generatedInputSummary: {
      ...sourceSnapshot.generatedInputSummary,
      range: { ...sourceSnapshot.generatedInputSummary.range },
      weekendGroupSchedule: sourceSnapshot.generatedInputSummary.weekendGroupSchedule.map(
        (entry) => ({ ...entry })
      ),
      activeBiasCriteria: sourceSnapshot.generatedInputSummary.activeBiasCriteria.map(
        (criteria) => ({
          ...criteria,
          locationIds: [...criteria.locationIds],
          shiftTypeIds: [...criteria.shiftTypeIds],
          weekdayConditions: [...criteria.weekdayConditions]
        })
      ),
      activeDutyLocations: sourceSnapshot.generatedInputSummary.activeDutyLocations.map(
        (location) => ({
          ...location
        })
      )
    }
  };
}

async function loadSourceData(
  dependencies: RosterWorkflowServiceDependencies,
  rosterMonth: YearMonthString,
  firstWeekendOffGroup: WeekendGroup
) {
  const range = getRosterMonthRange(rosterMonth);
  const weekendGroupSchedule = buildWeekendGroupScheduleForMonth(
    rosterMonth,
    firstWeekendOffGroup
  );
  const doctors = await dependencies.doctorManagementService.listDoctors();
  const activeDoctors = doctors.filter((doctor) => doctor.isActive);
  const dutyLocations =
    await dependencies.dutyLocationManagementService.getLocationList();
  const activeDutyLocations = dutyLocations.filter((location) => location.isActive);
  const biasCriteria =
    await dependencies.biasCriteriaManagementService.getCriteriaList();
  const activeBiasCriteria = biasCriteria.filter((criteria) => criteria.isActive);
  const leaves = await dependencies.leaveManagementService.listLeaves(
    range.startDate,
    range.endDate
  );
  const offRequests = await dependencies.offRequestService.listRequests(rosterMonth);
  const shiftTypes = await dependencies.shiftTypeManagementService.listShiftTypes({
    isActive: true
  });
  const currentBias =
    await dependencies.biasManagementService.listBiasLedgers(rosterMonth);
  const currentWeekdayPairBias =
    await dependencies.biasManagementService.listWeekdayPairBiasLedgers(rosterMonth);

  return {
    range,
    weekendGroupSchedule,
    activeDoctors,
    leaves,
    offRequests,
    shiftTypes,
    currentBias,
    currentWeekdayPairBias,
    activeBiasCriteria,
    activeDutyLocations
  };
}

async function appendRosterAuditLog(
  dependencies: RosterWorkflowServiceDependencies,
  input: {
    readonly actorId: EntityId;
    readonly actorRole: ActorRole;
    readonly actionType:
      | "ROSTER_GENERATED"
      | "ROSTER_PUBLISHED"
      | "ROSTER_LOCKED"
      | "ROSTER_UNLOCKED"
      | "ROSTER_DELETED"
      | "ROSTER_DELETE_BLOCKED";
    readonly snapshot: RosterSnapshot;
    readonly firstWeekendOffGroup: WeekendGroup;
    readonly extraDetails?: Readonly<Record<string, unknown>>;
  }
): Promise<void> {
  const activeBiasCriteria =
    input.snapshot.generatedInputSummary.activeBiasCriteria.map((criteria) => ({
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
    input.snapshot.generatedInputSummary.activeDutyLocations.map((location) => ({
      id: location.id,
      code: location.code,
      label: location.label,
      isActive: location.isActive
    }));

  await dependencies.auditLogService.appendLog({
    actorId: input.actorId,
    actorRole: input.actorRole,
    actionType: input.actionType,
    entityType: "ROSTER",
    entityId: input.snapshot.roster.id,
    details: {
      rosterMonth: input.snapshot.generatedInputSummary.rosterMonth,
      status: input.snapshot.roster.status,
      warningCount: input.snapshot.warnings.length,
      validationPassed: input.snapshot.validation.isValid,
      firstWeekendOffGroup: input.firstWeekendOffGroup,
      derivedFromRosterId: input.snapshot.derivedFromRosterId ?? null,
      activeCriteriaCount: activeBiasCriteria.length,
      activeBiasCriteria,
      activeDutyLocationCount: activeDutyLocations.length,
      activeDutyLocations,
      generationLocationId:
        activeDutyLocations.length === 1 ? activeDutyLocations[0].id : null,
      ...input.extraDetails
    }
  });
}

function assertAdminActorRole(actorRole: ActorRole): void {
  if (actorRole !== "ADMIN") {
    throw new UnauthorizedError("You do not have permission to manage roster lifecycle.");
  }
}

function ensureVisibleRosterSnapshot(
  snapshot: RosterSnapshot | null,
  rosterId: EntityId
): RosterSnapshot {
  if (!snapshot || snapshot.roster.isDeleted) {
    throw new RepositoryNotFoundError(
      `Roster '${rosterId}' was not found. It may already have been removed.`
    );
  }

  return snapshot;
}

function createUnlockedSnapshot(snapshot: RosterSnapshot): RosterSnapshot {
  const timestamp = new Date().toISOString();

  return {
    ...snapshot,
    roster: {
      ...snapshot.roster,
      status: "PUBLISHED",
      lockedAt: undefined,
      publishedAt: snapshot.roster.publishedAt ?? timestamp
    }
  };
}

function createDeletedSnapshot(
  snapshot: RosterSnapshot,
  actorId: EntityId
): RosterSnapshot {
  const timestamp = new Date().toISOString();

  return {
    ...snapshot,
    roster: {
      ...snapshot.roster,
      isDeleted: true,
      deletedAt: timestamp,
      deletedByActorId: actorId
    }
  };
}

export function createRosterWorkflowService(
  dependencies: RosterWorkflowServiceDependencies
): RosterWorkflowService {
  return {
    async getMonthContext(input) {
      const firstWeekendOffGroup = input.firstWeekendOffGroup ?? "A";
      const sourceData = await loadSourceData(
        dependencies,
        input.rosterMonth,
        firstWeekendOffGroup
      );
      const allSnapshots = await dependencies.rosterSnapshotRepository.list({
        rosterMonth: input.rosterMonth
      });
      const snapshots = filterDeletedSnapshots(allSnapshots);
      const latestDraft = findLatestSnapshotByStatus(snapshots, "DRAFT");
      const latestPublished = findLatestSnapshotByStatus(snapshots, "PUBLISHED");
      const latestLocked = findLatestSnapshotByStatus(snapshots, "LOCKED");

      return {
        rosterMonth: input.rosterMonth,
        range: sourceData.range,
        firstWeekendOffGroup,
        weekendGroupSchedule: sourceData.weekendGroupSchedule,
        activeDoctors: sourceData.activeDoctors,
        leaves: sourceData.leaves,
        offRequests: sourceData.offRequests,
        shiftTypes: sourceData.shiftTypes,
        currentBias: sourceData.currentBias,
        currentWeekdayPairBias: sourceData.currentWeekdayPairBias,
        activeBiasCriteria: sourceData.activeBiasCriteria,
        activeDutyLocations: sourceData.activeDutyLocations,
        sourceSummary: buildGeneratedInputSummary({
          rosterMonth: input.rosterMonth,
          range: sourceData.range,
          firstWeekendOffGroup,
          weekendGroupSchedule: sourceData.weekendGroupSchedule,
          activeDoctors: sourceData.activeDoctors,
          leaves: sourceData.leaves,
          offRequests: sourceData.offRequests,
          shiftTypes: sourceData.shiftTypes,
          activeBiasCriteria: sourceData.activeBiasCriteria,
          activeDutyLocations: sourceData.activeDutyLocations
        }),
        snapshots,
        latestDraft,
        latestPublished,
        latestLocked,
        activeOfficial: findActiveOfficialSnapshot(snapshots)
      };
    },
    async generateDraft(input) {
      const monthContext = await this.getMonthContext({
        rosterMonth: input.rosterMonth,
        firstWeekendOffGroup: input.firstWeekendOffGroup
      });

      if (monthContext.latestLocked) {
        throw new Error(
          `Roster month '${input.rosterMonth}' is already locked and cannot be regenerated.`
        );
      }

      if (monthContext.activeOfficial) {
        throw new Error(
          `Roster month '${input.rosterMonth}' already has an official roster. Generate new drafts before publishing in V1.`
        );
      }

      if (monthContext.activeDutyLocations.length !== 1) {
        throw new Error(
          "Phase 3 roster generation requires exactly one active duty location."
        );
      }

      const timestamp = new Date().toISOString();
      const rosterId = crypto.randomUUID();
      const result = generateRoster({
        rosterId,
        range: monthContext.range,
        doctors: monthContext.activeDoctors,
        shiftTypes: monthContext.shiftTypes,
        leaves: monthContext.leaves,
        offRequests: monthContext.offRequests,
        currentBias: monthContext.currentBias,
        activeBiasCriteria: monthContext.activeBiasCriteria,
        activeDutyLocations: monthContext.activeDutyLocations,
        generationLocationId: monthContext.activeDutyLocations[0].id,
        weekendGroupSchedule: monthContext.weekendGroupSchedule,
        generatedByActorId: input.actorId
      });

      const draftSnapshot: RosterSnapshot = {
        roster: {
          id: rosterId,
          period: monthContext.range,
          status: "DRAFT",
          isDeleted: false,
          createdAt: timestamp,
          createdByUserId: input.actorId,
          generatedAt: timestamp,
          weekendGroupSchedule: monthContext.weekendGroupSchedule,
          notes: input.notes
        },
        doctorReferences: buildRosterDoctorReferences(monthContext.activeDoctors),
        shifts: result.shifts,
        assignments: result.assignments,
        warnings: result.warnings,
        validation: result.validation,
        updatedBias: result.updatedBias,
        generatedInputSummary: monthContext.sourceSummary
      };

      const savedSnapshot =
        await dependencies.rosterSnapshotRepository.save(draftSnapshot);

      await appendRosterAuditLog(dependencies, {
        actorId: input.actorId,
        actorRole: input.actorRole,
        actionType: "ROSTER_GENERATED",
        snapshot: savedSnapshot,
        firstWeekendOffGroup: input.firstWeekendOffGroup
      });

      return savedSnapshot;
    },
    async publishDraft(input) {
      const draftSnapshot = ensureVisibleRosterSnapshot(
        await dependencies.rosterSnapshotRepository.findById(input.draftRosterId),
        input.draftRosterId
      );

      if (draftSnapshot.roster.status !== "DRAFT") {
        throw new RepositoryNotFoundError(
          `Draft roster '${input.draftRosterId}' was not found.`
        );
      }

      const monthContext = await this.getMonthContext({
        rosterMonth: draftSnapshot.generatedInputSummary.rosterMonth,
        firstWeekendOffGroup:
          draftSnapshot.generatedInputSummary.firstWeekendOffGroup
      });

      if (monthContext.latestLocked) {
        throw new Error(
          `Roster month '${draftSnapshot.generatedInputSummary.rosterMonth}' is already locked and cannot be published again.`
        );
      }

      const publishedSnapshot = createLifecycleSnapshot(
        draftSnapshot,
        "PUBLISHED",
        input.actorId
      );
      const savedSnapshot =
        await dependencies.rosterSnapshotRepository.save(publishedSnapshot);

      await dependencies.biasLedgerRepository.saveMany(
        savedSnapshot.updatedBias.map((entry) => ({
          ...entry,
          sourceReferenceId: savedSnapshot.roster.id,
          updatedAt: savedSnapshot.roster.publishedAt ?? savedSnapshot.roster.createdAt,
          updatedByActorId: input.actorId
        }))
      );

      if (savedSnapshot.updatedWeekdayPairBias?.length) {
        await dependencies.weekdayPairBiasLedgerRepository.saveMany(
          savedSnapshot.updatedWeekdayPairBias.map((entry) => ({
            ...entry,
            sourceReferenceId: savedSnapshot.roster.id,
            updatedAt:
              savedSnapshot.roster.publishedAt ?? savedSnapshot.roster.createdAt,
            updatedByActorId: input.actorId
          }))
        );
      }

      await appendRosterAuditLog(dependencies, {
        actorId: input.actorId,
        actorRole: input.actorRole,
        actionType: "ROSTER_PUBLISHED",
        snapshot: savedSnapshot,
        firstWeekendOffGroup:
          savedSnapshot.generatedInputSummary.firstWeekendOffGroup
      });

      return savedSnapshot;
    },
    async lockPublishedRoster(input) {
      const publishedSnapshot = ensureVisibleRosterSnapshot(
        await dependencies.rosterSnapshotRepository.findById(input.publishedRosterId),
        input.publishedRosterId
      );

      if (publishedSnapshot.roster.status !== "PUBLISHED") {
        throw new RepositoryNotFoundError(
          `Published roster '${input.publishedRosterId}' was not found.`
        );
      }

      const monthContext = await this.getMonthContext({
        rosterMonth: publishedSnapshot.generatedInputSummary.rosterMonth,
        firstWeekendOffGroup:
          publishedSnapshot.generatedInputSummary.firstWeekendOffGroup
      });

      if (monthContext.latestLocked) {
        throw new Error(
          `Roster month '${publishedSnapshot.generatedInputSummary.rosterMonth}' is already locked.`
        );
      }

      const lockedSnapshot = createLifecycleSnapshot(
        publishedSnapshot,
        "LOCKED",
        input.actorId
      );
      const savedSnapshot =
        await dependencies.rosterSnapshotRepository.save(lockedSnapshot);

      await appendRosterAuditLog(dependencies, {
        actorId: input.actorId,
        actorRole: input.actorRole,
        actionType: "ROSTER_LOCKED",
        snapshot: savedSnapshot,
        firstWeekendOffGroup:
          savedSnapshot.generatedInputSummary.firstWeekendOffGroup
      });

      return savedSnapshot;
    },
    async unlockLockedRoster(input) {
      assertAdminActorRole(input.actorRole);

      const snapshot = ensureVisibleRosterSnapshot(
        await dependencies.rosterSnapshotRepository.findById(input.lockedRosterId),
        input.lockedRosterId
      );

      if (snapshot.roster.status !== "LOCKED") {
        throw new Error("Only locked rosters can be unlocked.");
      }

      const unlockedSnapshot = createUnlockedSnapshot(snapshot);
      const savedSnapshot =
        await dependencies.rosterSnapshotRepository.save(unlockedSnapshot);

      await appendRosterAuditLog(dependencies, {
        actorId: input.actorId,
        actorRole: input.actorRole,
        actionType: "ROSTER_UNLOCKED",
        snapshot: savedSnapshot,
        firstWeekendOffGroup:
          savedSnapshot.generatedInputSummary.firstWeekendOffGroup,
        extraDetails: {
          previousStatus: "LOCKED",
          nextStatus: "PUBLISHED",
          unlockedAt: new Date().toISOString()
        }
      });

      return savedSnapshot;
    },
    async deleteRoster(input) {
      assertAdminActorRole(input.actorRole);

      const snapshot = ensureVisibleRosterSnapshot(
        await dependencies.rosterSnapshotRepository.findById(input.rosterId),
        input.rosterId
      );

      if (snapshot.roster.status === "LOCKED") {
        await appendRosterAuditLog(dependencies, {
          actorId: input.actorId,
          actorRole: input.actorRole,
          actionType: "ROSTER_DELETE_BLOCKED",
          snapshot,
          firstWeekendOffGroup: snapshot.generatedInputSummary.firstWeekendOffGroup,
          extraDetails: {
            blockedReason: "Cannot delete a locked roster. Unlock it first."
          }
        });

        throw new RosterDeletionError("Cannot delete a locked roster. Unlock it first.");
      }

      const deletedSnapshot = createDeletedSnapshot(snapshot, input.actorId);
      const savedSnapshot =
        await dependencies.rosterSnapshotRepository.save(deletedSnapshot);

      await appendRosterAuditLog(dependencies, {
        actorId: input.actorId,
        actorRole: input.actorRole,
        actionType: "ROSTER_DELETED",
        snapshot: savedSnapshot,
        firstWeekendOffGroup:
          savedSnapshot.generatedInputSummary.firstWeekendOffGroup,
        extraDetails: {
          previousStatus: snapshot.roster.status,
          deletedAt: savedSnapshot.roster.deletedAt ?? null
        }
      });
    }
  };
}
