import type {
  ActorRole,
  AllowedDoctorGroupIdByDate,
  BiasCriteria,
  BiasLedger,
  Doctor,
  DoctorGroup,
  DutyDesign,
  DutyDesignAssignmentsSnapshot,
  DutyDesignAssignment,
  DutyLocation,
  EntityId,
  ISODateString,
  Leave,
  OffRequest,
  Roster,
  RosterPeriod,
  RosterSnapshot,
  ShiftType,
  WeekdayPairBiasLedger,
  YearMonthString
} from "@/domain/models";
import { DEFAULT_DUTY_LOCATION_ID as DEFAULT_FALLBACK_LOCATION_ID } from "@/domain/models";
import type {
  BiasLedgerRepository,
  RosterSnapshotRepository,
  WeekdayPairBiasLedgerRepository
} from "@/domain/repositories";
import {
  RepositoryNotFoundError,
  RosterDeletionError,
} from "@/domain/repositories";
import { generateRoster } from "@/domain/scheduling";
import { assertAdminActorRole } from "@/features/admin/services/assertAdminActorRole";
import type { BiasCriteriaManagementService } from "@/features/admin/services/biasCriteriaManagementService";
import type { DutyLocationManagementService } from "@/features/admin/services/dutyLocationManagementService";
import type { AuditLogService } from "@/features/audit/services/auditLogService";
import {
  logRosterGeneratedWithDutyDesign,
  logRosterLifecycleEvent
} from "@/features/audit/services/lifecycleAuditLogging";
import type { DoctorGroupManagementService } from "@/features/doctors/services/doctorGroupManagementService";
import type { DoctorManagementService } from "@/features/doctors/services/doctorManagementService";
import type { DutyDesignAssignmentService } from "@/features/dutyDesigns/services/dutyDesignAssignmentService";
import type { DutyDesignManagementService } from "@/features/dutyDesigns/services/dutyDesignManagementService";
import type { BiasManagementService } from "@/features/fairness/services/biasManagementService";
import type { LeaveManagementService } from "@/features/leaves/services/leaveManagementService";
import type { OffRequestService } from "@/features/offRequests/services/offRequestService";
import { getRosterMonthRange } from "@/features/roster/services/weekendGroupScheduleService";
import type { ShiftTypeManagementService } from "@/features/shifts/services/shiftTypeManagementService";

export interface RosterMonthContext {
  readonly rosterMonth: YearMonthString;
  readonly range: RosterPeriod;
  readonly activeDoctors: ReadonlyArray<Doctor>;
  readonly doctorGroups: ReadonlyArray<DoctorGroup>;
  readonly leaves: ReadonlyArray<Leave>;
  readonly offRequests: ReadonlyArray<OffRequest>;
  readonly shiftTypes: ReadonlyArray<ShiftType>;
  readonly currentBias: ReadonlyArray<BiasLedger>;
  readonly currentWeekdayPairBias: ReadonlyArray<WeekdayPairBiasLedger>;
  readonly activeBiasCriteria: ReadonlyArray<BiasCriteria>;
  readonly activeDutyLocations: ReadonlyArray<DutyLocation>;
  readonly selectedDutyDesigns: ReadonlyArray<DutyDesign>;
  readonly dutyDesignAssignments: ReadonlyArray<DutyDesignAssignment>;
  readonly sourceSummary: RosterSnapshot["generatedInputSummary"];
  readonly snapshots: ReadonlyArray<RosterSnapshot>;
  readonly latestDraft: RosterSnapshot | null;
  readonly latestPublished: RosterSnapshot | null;
  readonly latestLocked: RosterSnapshot | null;
  readonly activeOfficial: RosterSnapshot | null;
}

export interface GetRosterMonthContextInput {
  readonly rosterMonth: YearMonthString;
}

export interface GenerateDraftRosterInput {
  readonly rosterMonth: YearMonthString;
  readonly allowedDoctorGroupIdByDate?: AllowedDoctorGroupIdByDate;
  readonly notes?: string;
  readonly dutyDesignAssignments?: ReadonlyArray<DutyDesignAssignment>;
  readonly publicHolidayDates?: ReadonlyArray<ISODateString>;
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
  readonly doctorGroupManagementService: DoctorGroupManagementService;
  readonly doctorManagementService: DoctorManagementService;
  readonly dutyDesignManagementService: DutyDesignManagementService;
  readonly dutyDesignAssignmentService: DutyDesignAssignmentService;
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

function buildDoctorGroupsById(
  doctorGroups: ReadonlyArray<DoctorGroup>
): Readonly<Record<EntityId, DoctorGroup>> {
  return Object.fromEntries(doctorGroups.map((group) => [group.id, { ...group }]));
}

function buildRosterDoctorReferences(
  doctors: ReadonlyArray<Doctor>,
  doctorGroupsById: Readonly<Record<EntityId, DoctorGroup>>
) {
  return doctors.map((doctor) => ({
    doctorId: doctor.id,
    name: doctor.name,
    uniqueIdentifier: doctor.uniqueIdentifier,
    groupId: doctor.groupId,
    groupName: doctor.groupId ? doctorGroupsById[doctor.groupId]?.name : undefined,
    isActive: doctor.isActive
  }));
}

function findLatestSnapshotByStatus(
  snapshots: ReadonlyArray<RosterSnapshot>,
  status: Roster["status"]
): RosterSnapshot | null {
  return snapshots.find((snapshot) => snapshot.roster.status === status) ?? null;
}

function cloneDutyDesign(dutyDesign: DutyDesign): DutyDesign {
  return {
    ...dutyDesign,
    dutyBlocks: dutyDesign.dutyBlocks.map((block) => ({ ...block }))
  };
}

function buildDutyDesignAssignmentsSnapshot(
  dutyDesignAssignments: ReadonlyArray<DutyDesignAssignment>
): DutyDesignAssignmentsSnapshot {
  const snapshot: Record<
    ISODateString,
    {
      standardDesignId?: EntityId;
      holidayOverrideDesignId?: EntityId;
    }
  > = {};

  dutyDesignAssignments.forEach((assignment) => {
    const entry = snapshot[assignment.date] ?? {};

    if (assignment.isHolidayOverride) {
      entry.holidayOverrideDesignId = assignment.dutyDesignId;
    } else {
      entry.standardDesignId = assignment.dutyDesignId;
    }

    snapshot[assignment.date] = entry;
  });

  return snapshot;
}

function cloneDutyDesignAssignmentsSnapshot(
  dutyDesignAssignments: DutyDesignAssignmentsSnapshot
): DutyDesignAssignmentsSnapshot {
  return Object.fromEntries(
    Object.entries(dutyDesignAssignments).map(([date, assignment]) => [
      date,
      {
        standardDesignId: assignment.standardDesignId,
        holidayOverrideDesignId: assignment.holidayOverrideDesignId
      }
    ])
  );
}

function buildDutyDesignSnapshot(
  dutyDesigns: ReadonlyArray<DutyDesign>
): RosterSnapshot["generatedInputSummary"]["dutyDesignSnapshot"] {
  return Object.fromEntries(
    dutyDesigns.map((dutyDesign) => [dutyDesign.id, cloneDutyDesign(dutyDesign)])
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

function buildDoctorGroupSnapshot(
  doctorGroups: ReadonlyArray<DoctorGroup>
): RosterSnapshot["generatedInputSummary"]["doctorGroupSnapshot"] {
  return cloneDoctorGroupSnapshot(buildDoctorGroupsById(doctorGroups));
}

function cloneAllowedDoctorGroupIdByDate(
  allowedDoctorGroupIdByDate: AllowedDoctorGroupIdByDate
): AllowedDoctorGroupIdByDate {
  return Object.fromEntries(Object.entries(allowedDoctorGroupIdByDate));
}

function selectDutyDesignsForAssignments(input: {
  readonly dutyDesigns: ReadonlyArray<DutyDesign>;
  readonly dutyDesignAssignments: ReadonlyArray<DutyDesignAssignment>;
}): ReadonlyArray<DutyDesign> {
  const selectedDesignIds = new Set(
    input.dutyDesignAssignments.map((assignment) => assignment.dutyDesignId)
  );

  return input.dutyDesigns
    .filter((dutyDesign) => selectedDesignIds.has(dutyDesign.id))
    .map(cloneDutyDesign);
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
  readonly activeDoctors: ReadonlyArray<Doctor>;
  readonly doctorGroups: ReadonlyArray<DoctorGroup>;
  readonly allowedDoctorGroupIdByDate: AllowedDoctorGroupIdByDate;
  readonly leaves: ReadonlyArray<Leave>;
  readonly offRequests: ReadonlyArray<OffRequest>;
  readonly shiftTypes: ReadonlyArray<ShiftType>;
  readonly activeBiasCriteria: ReadonlyArray<BiasCriteria>;
  readonly activeDutyLocations: ReadonlyArray<DutyLocation>;
  readonly selectedDutyDesigns: ReadonlyArray<DutyDesign>;
  readonly dutyDesignAssignments: ReadonlyArray<DutyDesignAssignment>;
  readonly publicHolidayDates: ReadonlyArray<ISODateString>;
  readonly fallbackLocationId: EntityId;
}): RosterSnapshot["generatedInputSummary"] {
  return {
    rosterMonth: input.rosterMonth,
    range: input.range,
    activeDoctorCount: input.activeDoctors.length,
    leaveCount: input.leaves.length,
    offRequestCount: input.offRequests.length,
    shiftTypeCount: input.shiftTypes.length,
    activeBiasCriteria: input.activeBiasCriteria.map((criteria) => ({
      ...criteria,
      locationIds: [...criteria.locationIds],
      shiftTypeIds: [...criteria.shiftTypeIds],
      weekdayConditions: [...criteria.weekdayConditions]
    })),
    activeDutyLocations: input.activeDutyLocations.map((location) => ({
      ...location
    })),
    doctorGroupSnapshot: buildDoctorGroupSnapshot(input.doctorGroups),
    allowedDoctorGroupIdByDate: cloneAllowedDoctorGroupIdByDate(
      input.allowedDoctorGroupIdByDate
    ),
    dutyDesignAssignments: buildDutyDesignAssignmentsSnapshot(
      input.dutyDesignAssignments
    ),
    dutyDesignSnapshot: buildDutyDesignSnapshot(input.selectedDutyDesigns),
    publicHolidayDates: [...input.publicHolidayDates],
    fallbackLocationId: input.fallbackLocationId
  };
}

function cloneShiftIdsForNewRoster(snapshot: RosterSnapshot, nextRosterId: EntityId) {
  const shiftIdMap = new Map<EntityId, EntityId>();
  const shifts = snapshot.shifts.map((shift) => {
    const shiftIdSuffix =
      shift.id.includes(":") ? shift.id.slice(shift.id.indexOf(":") + 1) : shift.id;
    const nextShiftId = `${nextRosterId}:${shiftIdSuffix}`;
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
      weekendGroupSchedule: sourceSnapshot.roster.weekendGroupSchedule?.map((entry) => ({
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
      weekendGroupSchedule:
        sourceSnapshot.generatedInputSummary.weekendGroupSchedule?.map((entry) => ({
          ...entry
        })),
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
      ),
      dutyDesignAssignments: cloneDutyDesignAssignmentsSnapshot(
        sourceSnapshot.generatedInputSummary.dutyDesignAssignments
      ),
      doctorGroupSnapshot: cloneDoctorGroupSnapshot(
        sourceSnapshot.generatedInputSummary.doctorGroupSnapshot
      ),
      allowedDoctorGroupIdByDate: cloneAllowedDoctorGroupIdByDate(
        sourceSnapshot.generatedInputSummary.allowedDoctorGroupIdByDate
      ),
      dutyDesignSnapshot: cloneDutyDesignSnapshot(
        sourceSnapshot.generatedInputSummary.dutyDesignSnapshot
      ),
      publicHolidayDates: [...sourceSnapshot.generatedInputSummary.publicHolidayDates]
    }
  };
}

async function loadSourceData(
  dependencies: RosterWorkflowServiceDependencies,
  rosterMonth: YearMonthString
) {
  const range = getRosterMonthRange(rosterMonth);
  const doctorGroups =
    await dependencies.doctorGroupManagementService.listDoctorGroups();
  const doctors = await dependencies.doctorManagementService.listDoctors();
  const activeDoctors = doctors.filter((doctor) => doctor.isActive);
  const dutyDesigns =
    await dependencies.dutyDesignManagementService.listDutyDesigns();
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
  const dutyDesignAssignments =
    await dependencies.dutyDesignAssignmentService.listAssignmentsByMonth(range);
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
    activeDoctors,
    doctorGroups,
    dutyDesigns,
    dutyDesignAssignments,
    selectedDutyDesigns: selectDutyDesignsForAssignments({
      dutyDesigns,
      dutyDesignAssignments
    }),
    leaves,
    offRequests,
    shiftTypes,
    currentBias,
    currentWeekdayPairBias,
    activeBiasCriteria,
    activeDutyLocations
  };
}

function resolveFallbackLocationId(
  activeDutyLocations: ReadonlyArray<DutyLocation>
): EntityId {
  const fallbackLocation = activeDutyLocations.find(
    (location) => location.id === DEFAULT_FALLBACK_LOCATION_ID
  );

  if (!fallbackLocation) {
    throw new Error(
      `Roster generation requires the default duty location '${DEFAULT_FALLBACK_LOCATION_ID}' to be active.`
    );
  }

  return fallbackLocation.id;
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
      const sourceData = await loadSourceData(dependencies, input.rosterMonth);
      const fallbackLocationId = resolveFallbackLocationId(
        sourceData.activeDutyLocations
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
        activeDoctors: sourceData.activeDoctors,
        doctorGroups: sourceData.doctorGroups,
        leaves: sourceData.leaves,
        offRequests: sourceData.offRequests,
        shiftTypes: sourceData.shiftTypes,
        currentBias: sourceData.currentBias,
        currentWeekdayPairBias: sourceData.currentWeekdayPairBias,
        activeBiasCriteria: sourceData.activeBiasCriteria,
        activeDutyLocations: sourceData.activeDutyLocations,
        selectedDutyDesigns: sourceData.selectedDutyDesigns,
        dutyDesignAssignments: sourceData.dutyDesignAssignments,
        sourceSummary: buildGeneratedInputSummary({
          rosterMonth: input.rosterMonth,
          range: sourceData.range,
          activeDoctors: sourceData.activeDoctors,
          doctorGroups: sourceData.doctorGroups,
          allowedDoctorGroupIdByDate: {},
          leaves: sourceData.leaves,
          offRequests: sourceData.offRequests,
          shiftTypes: sourceData.shiftTypes,
          activeBiasCriteria: sourceData.activeBiasCriteria,
          activeDutyLocations: sourceData.activeDutyLocations,
          selectedDutyDesigns: sourceData.selectedDutyDesigns,
          dutyDesignAssignments: sourceData.dutyDesignAssignments,
          publicHolidayDates: [],
          fallbackLocationId
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
        rosterMonth: input.rosterMonth
      });
      const sourceData = await loadSourceData(dependencies, input.rosterMonth);

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
      const dutyDesignAssignments =
        input.dutyDesignAssignments ?? monthContext.dutyDesignAssignments;
      const publicHolidayDates = [...(input.publicHolidayDates ?? [])];
      const allowedDoctorGroupIdByDate = cloneAllowedDoctorGroupIdByDate(
        input.allowedDoctorGroupIdByDate ?? {}
      );
      const selectedDutyDesigns = selectDutyDesignsForAssignments({
        dutyDesigns: sourceData.dutyDesigns,
        dutyDesignAssignments
      });
      const generatedInputSummary = buildGeneratedInputSummary({
        rosterMonth: input.rosterMonth,
        range: monthContext.range,
        activeDoctors: monthContext.activeDoctors,
        doctorGroups: monthContext.doctorGroups,
        allowedDoctorGroupIdByDate,
        leaves: monthContext.leaves,
        offRequests: monthContext.offRequests,
        shiftTypes: monthContext.shiftTypes,
        activeBiasCriteria: monthContext.activeBiasCriteria,
        activeDutyLocations: monthContext.activeDutyLocations,
        selectedDutyDesigns,
        dutyDesignAssignments,
        publicHolidayDates,
        fallbackLocationId: resolveFallbackLocationId(monthContext.activeDutyLocations)
      });
      const result = generateRoster({
        rosterId,
        range: monthContext.range,
        doctors: monthContext.activeDoctors,
        shiftTypes: monthContext.shiftTypes,
        dutyDesigns: sourceData.dutyDesigns,
        dutyDesignAssignments,
        publicHolidayDates,
        leaves: monthContext.leaves,
        offRequests: monthContext.offRequests,
        currentBias: monthContext.currentBias,
        activeBiasCriteria: monthContext.activeBiasCriteria,
        activeDutyLocations: monthContext.activeDutyLocations,
        fallbackLocationId: generatedInputSummary.fallbackLocationId,
        allowedDoctorGroupIdByDate,
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
          notes: input.notes
        },
        doctorReferences: buildRosterDoctorReferences(
          monthContext.activeDoctors,
          buildDoctorGroupsById(monthContext.doctorGroups)
        ),
        shifts: result.shifts,
        assignments: result.assignments,
        warnings: result.warnings,
        validation: result.validation,
        updatedBias: result.updatedBias,
        generatedInputSummary
      };

      const savedSnapshot =
        await dependencies.rosterSnapshotRepository.save(draftSnapshot);

      await logRosterGeneratedWithDutyDesign(dependencies.auditLogService, {
        actorId: input.actorId,
        actorRole: input.actorRole,
        snapshot: savedSnapshot
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
        rosterMonth: draftSnapshot.generatedInputSummary.rosterMonth
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

      await logRosterLifecycleEvent(dependencies.auditLogService, {
        actorId: input.actorId,
        actorRole: input.actorRole,
        actionType: "ROSTER_PUBLISHED",
        snapshot: savedSnapshot
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
        rosterMonth: publishedSnapshot.generatedInputSummary.rosterMonth
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

      await logRosterLifecycleEvent(dependencies.auditLogService, {
        actorId: input.actorId,
        actorRole: input.actorRole,
        actionType: "ROSTER_LOCKED",
        snapshot: savedSnapshot
      });

      return savedSnapshot;
    },
    async unlockLockedRoster(input) {
      assertAdminActorRole(
        input.actorRole,
        "You do not have permission to manage roster lifecycle."
      );

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

      await logRosterLifecycleEvent(dependencies.auditLogService, {
        actorId: input.actorId,
        actorRole: input.actorRole,
        actionType: "ROSTER_UNLOCKED",
        snapshot: savedSnapshot,
        extraDetails: {
          previousStatus: "LOCKED",
          nextStatus: "PUBLISHED",
          unlockedAt: new Date().toISOString()
        }
      });

      return savedSnapshot;
    },
    async deleteRoster(input) {
      assertAdminActorRole(
        input.actorRole,
        "You do not have permission to manage roster lifecycle."
      );

      const snapshot = ensureVisibleRosterSnapshot(
        await dependencies.rosterSnapshotRepository.findById(input.rosterId),
        input.rosterId
      );

      if (snapshot.roster.status === "LOCKED") {
        await logRosterLifecycleEvent(dependencies.auditLogService, {
          actorId: input.actorId,
          actorRole: input.actorRole,
          actionType: "ROSTER_DELETE_BLOCKED",
          snapshot,
          extraDetails: {
            blockedReason: "Cannot delete a locked roster. Unlock it first."
          }
        });

        throw new RosterDeletionError("Cannot delete a locked roster. Unlock it first.");
      }

      const deletedSnapshot = createDeletedSnapshot(snapshot, input.actorId);
      const savedSnapshot =
        await dependencies.rosterSnapshotRepository.save(deletedSnapshot);

      await logRosterLifecycleEvent(dependencies.auditLogService, {
        actorId: input.actorId,
        actorRole: input.actorRole,
        actionType: "ROSTER_DELETED",
        snapshot: savedSnapshot,
        extraDetails: {
          previousStatus: snapshot.roster.status,
          deletedAt: savedSnapshot.roster.deletedAt ?? null
        }
      });
    }
  };
}
