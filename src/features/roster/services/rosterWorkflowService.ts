import type {
  ActorRole,
  BiasLedger,
  Doctor,
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
import { RepositoryNotFoundError } from "@/domain/repositories";
import { generateRoster } from "@/domain/scheduling";
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

export interface RosterWorkflowService {
  getMonthContext(input: GetRosterMonthContextInput): Promise<RosterMonthContext>;
  generateDraft(input: GenerateDraftRosterInput): Promise<RosterSnapshot>;
  publishDraft(input: PublishDraftRosterInput): Promise<RosterSnapshot>;
  lockPublishedRoster(input: LockPublishedRosterInput): Promise<RosterSnapshot>;
}

export interface RosterWorkflowServiceDependencies {
  readonly doctorManagementService: DoctorManagementService;
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
}): RosterSnapshot["generatedInputSummary"] {
  return {
    rosterMonth: input.rosterMonth,
    range: input.range,
    activeDoctorCount: input.activeDoctors.length,
    leaveCount: input.leaves.length,
    offRequestCount: input.offRequests.length,
    shiftTypeCount: input.shiftTypes.length,
    firstWeekendOffGroup: input.firstWeekendOffGroup,
    weekendGroupSchedule: input.weekendGroupSchedule
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
      balance: { ...entry.balance },
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
    currentWeekdayPairBias
  };
}

async function appendRosterAuditLog(
  dependencies: RosterWorkflowServiceDependencies,
  input: {
    readonly actorId: EntityId;
    readonly actorRole: ActorRole;
    readonly actionType: "ROSTER_GENERATED" | "ROSTER_PUBLISHED" | "ROSTER_LOCKED";
    readonly snapshot: RosterSnapshot;
    readonly firstWeekendOffGroup: WeekendGroup;
  }
): Promise<void> {
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
      derivedFromRosterId: input.snapshot.derivedFromRosterId ?? null
    }
  });
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
      const snapshots = await dependencies.rosterSnapshotRepository.list({
        rosterMonth: input.rosterMonth
      });
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
        sourceSummary: buildGeneratedInputSummary({
          rosterMonth: input.rosterMonth,
          range: sourceData.range,
          firstWeekendOffGroup,
          weekendGroupSchedule: sourceData.weekendGroupSchedule,
          activeDoctors: sourceData.activeDoctors,
          leaves: sourceData.leaves,
          offRequests: sourceData.offRequests,
          shiftTypes: sourceData.shiftTypes
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
        currentWeekdayPairBias: monthContext.currentWeekdayPairBias,
        weekendGroupSchedule: monthContext.weekendGroupSchedule,
        generatedByActorId: input.actorId
      });

      const draftSnapshot: RosterSnapshot = {
        roster: {
          id: rosterId,
          period: monthContext.range,
          status: "DRAFT",
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
        updatedWeekdayPairBias: result.updatedWeekdayPairBias,
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
      const draftSnapshot =
        await dependencies.rosterSnapshotRepository.findById(input.draftRosterId);

      if (!draftSnapshot || draftSnapshot.roster.status !== "DRAFT") {
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
      const publishedSnapshot =
        await dependencies.rosterSnapshotRepository.findById(input.publishedRosterId);

      if (!publishedSnapshot || publishedSnapshot.roster.status !== "PUBLISHED") {
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
    }
  };
}
