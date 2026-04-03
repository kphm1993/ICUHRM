import { afterEach, describe, expect, it } from "vitest";
import type { ActorRole, BiasCriteria, DutyLocation } from "@/domain/models";
import { DEFAULT_DUTY_LOCATION_ID } from "@/domain/models";
import {
  CriteriaInUseError,
  NoCriteriaDefinedError,
  RepositoryNotFoundError,
  RosterDeletionError,
  UnauthorizedError
} from "@/domain/repositories";
import {
  ROSTER_SEED_DOCTORS,
  ROSTER_SEED_SHIFT_TYPES
} from "@/app/seed/rosterSeedData";
import { createBiasCriteriaManagementService } from "@/features/admin/services/biasCriteriaManagementService";
import { createDutyLocationManagementService } from "@/features/admin/services/dutyLocationManagementService";
import { createAuditLogService } from "@/features/audit/services/auditLogService";
import { createDoctorManagementService } from "@/features/doctors/services/doctorManagementService";
import { createBiasManagementService } from "@/features/fairness/services/biasManagementService";
import { createLeaveManagementService } from "@/features/leaves/services/leaveManagementService";
import { createOffRequestService } from "@/features/offRequests/services/offRequestService";
import { createRosterWorkflowService } from "@/features/roster/services/rosterWorkflowService";
import { createShiftTypeManagementService } from "@/features/shifts/services/shiftTypeManagementService";
import {
  InMemoryBiasCriteriaRepository,
  InMemoryBiasLedgerRepository,
  InMemoryDoctorRepository,
  InMemoryDutyLocationRepository,
  InMemoryLeaveRepository,
  InMemoryShiftTypeRepository,
  InMemoryWeekdayPairBiasLedgerRepository
} from "@/infrastructure/repositories/inMemory";
import {
  LocalStorageAuditLogRepository,
  LocalStorageOffRequestRepository,
  LocalStorageRosterSnapshotRepository,
  removeStorageCollection
} from "@/infrastructure/repositories/browserStorage";

const ACTOR_ID = "user-admin-demo";
const ACTOR_ROLE: ActorRole = "ADMIN";

function createDefaultLocation(overrides: Partial<DutyLocation> = {}): DutyLocation {
  return {
    id: overrides.id ?? DEFAULT_DUTY_LOCATION_ID,
    code: overrides.code ?? "CCU",
    label: overrides.label ?? "Cardiac Care Unit",
    description:
      overrides.description ?? "Default duty location used for criteria-based tests.",
    isActive: overrides.isActive ?? true,
    createdAt: overrides.createdAt ?? "2026-04-03T08:00:00.000Z",
    updatedAt: overrides.updatedAt ?? "2026-04-03T08:00:00.000Z"
  };
}

function createCriteriaFixtures(): ReadonlyArray<BiasCriteria> {
  return [
    {
      id: "criteria-day-all",
      code: "DAY_ALL",
      label: "All Day Shifts",
      locationIds: [DEFAULT_DUTY_LOCATION_ID],
      shiftTypeIds: ["shift-type-day"],
      weekdayConditions: [],
      isWeekendOnly: false,
      isActive: true,
      isLocked: false,
      createdAt: "2026-04-03T08:00:00.000Z",
      updatedAt: "2026-04-03T08:00:00.000Z",
      createdByActorId: ACTOR_ID,
      updatedByActorId: ACTOR_ID
    },
    {
      id: "criteria-night-all",
      code: "NIGHT_ALL",
      label: "All Night Shifts",
      locationIds: [DEFAULT_DUTY_LOCATION_ID],
      shiftTypeIds: ["shift-type-night"],
      weekdayConditions: [],
      isWeekendOnly: false,
      isActive: true,
      isLocked: false,
      createdAt: "2026-04-03T08:00:00.000Z",
      updatedAt: "2026-04-03T08:00:00.000Z",
      createdByActorId: ACTOR_ID,
      updatedByActorId: ACTOR_ID
    }
  ];
}

function cloneValue<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function createWorkflowHarness(options?: {
  readonly criteria?: ReadonlyArray<BiasCriteria>;
  readonly locations?: ReadonlyArray<DutyLocation>;
}) {
  const storageKeyPrefix = `icu-hrm-phase4-${crypto.randomUUID()}`;
  const auditLogRepository = new LocalStorageAuditLogRepository({
    storageKey: `${storageKeyPrefix}:audit-logs`
  });
  const rosterSnapshotRepository = new LocalStorageRosterSnapshotRepository({
    storageKey: `${storageKeyPrefix}:roster-snapshots`
  });
  const offRequestRepository = new LocalStorageOffRequestRepository({
    storageKey: `${storageKeyPrefix}:off-requests`,
    seedData: []
  });
  const doctorRepository = new InMemoryDoctorRepository(
    ROSTER_SEED_DOCTORS.filter((doctor) => doctor.isActive)
  );
  const leaveRepository = new InMemoryLeaveRepository([]);
  const shiftTypeRepository = new InMemoryShiftTypeRepository(ROSTER_SEED_SHIFT_TYPES);
  const biasCriteriaRepository = new InMemoryBiasCriteriaRepository(
    options?.criteria ?? createCriteriaFixtures()
  );
  const dutyLocationRepository = new InMemoryDutyLocationRepository(
    options?.locations ?? [createDefaultLocation()]
  );
  const biasLedgerRepository = new InMemoryBiasLedgerRepository();
  const weekdayPairBiasLedgerRepository =
    new InMemoryWeekdayPairBiasLedgerRepository();
  const auditLogService = createAuditLogService({
    auditLogRepository
  });

  const biasCriteriaManagementService = createBiasCriteriaManagementService({
    biasCriteriaRepository,
    biasLedgerRepository,
    doctorRepository,
    rosterSnapshotRepository,
    auditLogService
  });
  const dutyLocationManagementService = createDutyLocationManagementService({
    dutyLocationRepository,
    biasCriteriaRepository,
    rosterSnapshotRepository,
    auditLogService
  });
  const doctorManagementService = createDoctorManagementService({
    doctorRepository,
    leaveRepository,
    offRequestRepository,
    biasLedgerRepository,
    weekdayPairBiasLedgerRepository,
    rosterSnapshotRepository,
    auditLogService
  });
  const leaveManagementService = createLeaveManagementService({
    leaveRepository
  });
  const shiftTypeManagementService = createShiftTypeManagementService({
    shiftTypeRepository
  });
  const offRequestService = createOffRequestService({
    offRequestRepository,
    rosterSnapshotRepository
  });
  const biasManagementService = createBiasManagementService({
    biasCriteriaRepository,
    biasLedgerRepository,
    weekdayPairBiasLedgerRepository
  });
  const rosterWorkflowService = createRosterWorkflowService({
    biasCriteriaManagementService,
    doctorManagementService,
    dutyLocationManagementService,
    leaveManagementService,
    shiftTypeManagementService,
    offRequestService,
    biasManagementService,
    biasLedgerRepository,
    weekdayPairBiasLedgerRepository,
    rosterSnapshotRepository,
    auditLogService
  });

  return {
    auditLogService,
    biasCriteriaManagementService,
    dutyLocationManagementService,
    rosterSnapshotRepository,
    rosterWorkflowService,
    cleanup() {
      removeStorageCollection(`${storageKeyPrefix}:audit-logs`);
      removeStorageCollection(`${storageKeyPrefix}:roster-snapshots`);
      removeStorageCollection(`${storageKeyPrefix}:off-requests`);
    }
  };
}

afterEach(() => {
  window.localStorage.clear();
});

describe("rosterWorkflowService", () => {
  it("preserves historical criteria and location snapshots across publish-lock and later admin edits", async () => {
    const harness = createWorkflowHarness();

    try {
      const draft = await harness.rosterWorkflowService.generateDraft({
        rosterMonth: "2026-05",
        firstWeekendOffGroup: "A",
        actorId: ACTOR_ID,
        actorRole: ACTOR_ROLE
      });
      const published = await harness.rosterWorkflowService.publishDraft({
        draftRosterId: draft.roster.id,
        actorId: ACTOR_ID,
        actorRole: ACTOR_ROLE
      });
      const locked = await harness.rosterWorkflowService.lockPublishedRoster({
        publishedRosterId: published.roster.id,
        actorId: ACTOR_ID,
        actorRole: ACTOR_ROLE
      });

      const publishedCriteriaSnapshot = cloneValue(
        published.generatedInputSummary.activeBiasCriteria
      );
      const publishedLocationSnapshot = cloneValue(
        published.generatedInputSummary.activeDutyLocations
      );
      const publishedUpdatedBias = cloneValue(published.updatedBias);

      await harness.biasCriteriaManagementService.updateCriteria({
        id: "criteria-day-all",
        code: "DAY_ALL",
        label: "All Day Shifts Updated",
        locationIds: [DEFAULT_DUTY_LOCATION_ID],
        shiftTypeIds: ["shift-type-day"],
        weekdayConditions: ["MON", "TUE", "WED", "THU", "FRI"],
        isWeekendOnly: false,
        isActive: true,
        actorId: ACTOR_ID,
        actorRole: ACTOR_ROLE
      });
      await harness.dutyLocationManagementService.updateLocation({
        id: DEFAULT_DUTY_LOCATION_ID,
        code: "CCU",
        label: "Cardiac Care Unit Updated",
        description: "Updated after roster publication.",
        isActive: true,
        actorId: ACTOR_ID,
        actorRole: ACTOR_ROLE
      });

      const persistedPublishedSnapshot = await harness.rosterSnapshotRepository.findById(
        published.roster.id
      );
      const persistedLockedSnapshot = await harness.rosterSnapshotRepository.findById(
        locked.roster.id
      );

      expect(persistedPublishedSnapshot?.generatedInputSummary.activeBiasCriteria).toEqual(
        publishedCriteriaSnapshot
      );
      expect(persistedPublishedSnapshot?.generatedInputSummary.activeDutyLocations).toEqual(
        publishedLocationSnapshot
      );
      expect(persistedPublishedSnapshot?.updatedBias).toEqual(publishedUpdatedBias);
      expect(persistedLockedSnapshot?.generatedInputSummary.activeBiasCriteria).toEqual(
        publishedCriteriaSnapshot
      );
      expect(persistedLockedSnapshot?.generatedInputSummary.activeDutyLocations).toEqual(
        publishedLocationSnapshot
      );

      await expect(
        harness.biasCriteriaManagementService.deleteCriteria({
          id: "criteria-day-all",
          actorId: ACTOR_ID,
          actorRole: ACTOR_ROLE
        })
      ).rejects.toBeInstanceOf(CriteriaInUseError);

      const rosterAuditLogs = await harness.auditLogService.listLogs({
        entityType: "ROSTER"
      });
      expect(rosterAuditLogs).toHaveLength(3);

      const generatedLog = rosterAuditLogs.find(
        (entry) => entry.actionType === "ROSTER_GENERATED"
      );
      const publishedLog = rosterAuditLogs.find(
        (entry) => entry.actionType === "ROSTER_PUBLISHED"
      );
      const lockedLog = rosterAuditLogs.find(
        (entry) => entry.actionType === "ROSTER_LOCKED"
      );

      expect(generatedLog?.details).toMatchObject({
        rosterMonth: "2026-05",
        status: "DRAFT",
        activeCriteriaCount: 2,
        activeDutyLocationCount: 1,
        generationLocationId: DEFAULT_DUTY_LOCATION_ID
      });
      expect(generatedLog?.details.activeBiasCriteria).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: "criteria-day-all",
            code: "DAY_ALL"
          }),
          expect.objectContaining({
            id: "criteria-night-all",
            code: "NIGHT_ALL"
          })
        ])
      );
      expect(generatedLog?.details.activeDutyLocations).toEqual([
        expect.objectContaining({
          id: DEFAULT_DUTY_LOCATION_ID,
          code: "CCU"
        })
      ]);
      expect(publishedLog?.details).toMatchObject({
        status: "PUBLISHED",
        derivedFromRosterId: draft.roster.id
      });
      expect(lockedLog?.details).toMatchObject({
        status: "LOCKED",
        derivedFromRosterId: published.roster.id
      });
    } finally {
      harness.cleanup();
    }
  });

  it("fails generation when no active criteria exist", async () => {
    const harness = createWorkflowHarness({
      criteria: []
    });

    try {
      await expect(
        harness.rosterWorkflowService.generateDraft({
          rosterMonth: "2026-05",
          firstWeekendOffGroup: "A",
          actorId: ACTOR_ID,
          actorRole: ACTOR_ROLE
        })
      ).rejects.toBeInstanceOf(NoCriteriaDefinedError);
    } finally {
      harness.cleanup();
    }
  });

  it("fails generation when multiple active locations are configured", async () => {
    const harness = createWorkflowHarness({
      locations: [
        createDefaultLocation(),
        createDefaultLocation({
          id: "duty-location-icu",
          code: "ICU",
          label: "Intensive Care Unit"
        })
      ]
    });

    try {
      await expect(
        harness.rosterWorkflowService.generateDraft({
          rosterMonth: "2026-05",
          firstWeekendOffGroup: "A",
          actorId: ACTOR_ID,
          actorRole: ACTOR_ROLE
        })
      ).rejects.toThrow(
        "Phase 3 roster generation requires exactly one active duty location."
      );
    } finally {
      harness.cleanup();
    }
  });

  it("unlocks locked rosters in place and then allows soft deletion", async () => {
    const harness = createWorkflowHarness();

    try {
      const draft = await harness.rosterWorkflowService.generateDraft({
        rosterMonth: "2026-06",
        firstWeekendOffGroup: "A",
        actorId: ACTOR_ID,
        actorRole: ACTOR_ROLE
      });
      const published = await harness.rosterWorkflowService.publishDraft({
        draftRosterId: draft.roster.id,
        actorId: ACTOR_ID,
        actorRole: ACTOR_ROLE
      });
      const locked = await harness.rosterWorkflowService.lockPublishedRoster({
        publishedRosterId: published.roster.id,
        actorId: ACTOR_ID,
        actorRole: ACTOR_ROLE
      });

      await expect(
        harness.rosterWorkflowService.deleteRoster({
          rosterId: locked.roster.id,
          actorId: ACTOR_ID,
          actorRole: ACTOR_ROLE
        })
      ).rejects.toBeInstanceOf(RosterDeletionError);

      const unlocked = await harness.rosterWorkflowService.unlockLockedRoster({
        lockedRosterId: locked.roster.id,
        actorId: ACTOR_ID,
        actorRole: ACTOR_ROLE
      });

      expect(unlocked.roster.id).toBe(locked.roster.id);
      expect(unlocked.roster.status).toBe("PUBLISHED");
      expect(unlocked.roster.lockedAt).toBeUndefined();

      await harness.rosterWorkflowService.deleteRoster({
        rosterId: unlocked.roster.id,
        actorId: ACTOR_ID,
        actorRole: ACTOR_ROLE
      });

      const deletedSnapshot = await harness.rosterSnapshotRepository.findById(
        unlocked.roster.id
      );
      const monthContext = await harness.rosterWorkflowService.getMonthContext({
        rosterMonth: "2026-06",
        firstWeekendOffGroup: "A"
      });
      const rosterAuditLogs = await harness.auditLogService.listLogs({
        entityType: "ROSTER"
      });

      expect(deletedSnapshot?.roster.isDeleted).toBe(true);
      expect(deletedSnapshot?.roster.deletedByActorId).toBe(ACTOR_ID);
      expect(monthContext.snapshots.some((snapshot) => snapshot.roster.id === unlocked.roster.id)).toBe(false);
      expect(monthContext.activeOfficial?.roster.id).toBe(published.roster.id);
      expect(rosterAuditLogs.some((entry) => entry.actionType === "ROSTER_UNLOCKED")).toBe(
        true
      );
      expect(rosterAuditLogs.some((entry) => entry.actionType === "ROSTER_DELETED")).toBe(
        true
      );
      expect(
        rosterAuditLogs.some((entry) => entry.actionType === "ROSTER_DELETE_BLOCKED")
      ).toBe(true);
    } finally {
      harness.cleanup();
    }
  });

  it("allows deleting draft and published rosters but not missing or unauthorized requests", async () => {
    const harness = createWorkflowHarness();

    try {
      const draft = await harness.rosterWorkflowService.generateDraft({
        rosterMonth: "2026-07",
        firstWeekendOffGroup: "A",
        actorId: ACTOR_ID,
        actorRole: ACTOR_ROLE
      });

      await harness.rosterWorkflowService.deleteRoster({
        rosterId: draft.roster.id,
        actorId: ACTOR_ID,
        actorRole: ACTOR_ROLE
      });

      await expect(
        harness.rosterWorkflowService.deleteRoster({
          rosterId: draft.roster.id,
          actorId: ACTOR_ID,
          actorRole: ACTOR_ROLE
        })
      ).rejects.toBeInstanceOf(RepositoryNotFoundError);

      const nextDraft = await harness.rosterWorkflowService.generateDraft({
        rosterMonth: "2026-08",
        firstWeekendOffGroup: "A",
        actorId: ACTOR_ID,
        actorRole: ACTOR_ROLE
      });
      const nextPublished = await harness.rosterWorkflowService.publishDraft({
        draftRosterId: nextDraft.roster.id,
        actorId: ACTOR_ID,
        actorRole: ACTOR_ROLE
      });

      await expect(
        harness.rosterWorkflowService.deleteRoster({
          rosterId: nextPublished.roster.id,
          actorId: ACTOR_ID,
          actorRole: "DOCTOR"
        })
      ).rejects.toBeInstanceOf(UnauthorizedError);

      await harness.rosterWorkflowService.deleteRoster({
        rosterId: nextPublished.roster.id,
        actorId: ACTOR_ID,
        actorRole: ACTOR_ROLE
      });

      const monthContext = await harness.rosterWorkflowService.getMonthContext({
        rosterMonth: "2026-08",
        firstWeekendOffGroup: "A"
      });

      expect(monthContext.activeOfficial).toBeNull();
    } finally {
      harness.cleanup();
    }
  });
});
