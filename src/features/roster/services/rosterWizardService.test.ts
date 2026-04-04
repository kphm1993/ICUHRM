import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ActorRole, BiasCriteria, RosterWizardDraft } from "@/domain/models";
import {
  RepositoryNotFoundError,
  UnauthorizedError
} from "@/domain/repositories";
import { createAuditLogService } from "@/features/audit/services/auditLogService";
import { createBiasManagementService } from "@/features/fairness/services/biasManagementService";
import { createRosterWizardService } from "@/features/roster/services/rosterWizardService";
import {
  InMemoryBiasCriteriaRepository,
  InMemoryBiasLedgerRepository,
  InMemoryRosterWizardDraftRepository,
  InMemoryWeekdayPairBiasLedgerRepository
} from "@/infrastructure/repositories/inMemory";
import {
  LocalStorageAuditLogRepository,
  removeStorageCollection
} from "@/infrastructure/repositories/browserStorage";

const ACTOR_ID = "user-admin-demo";
const ACTOR_ROLE: ActorRole = "ADMIN";
const NOW = "2026-04-12T09:00:00.000Z";

function createCriteria(): ReadonlyArray<BiasCriteria> {
  return [
    {
      id: "criteria-day-all",
      code: "DAY_ALL",
      label: "All Day Shifts",
      locationIds: [],
      shiftTypeIds: [],
      weekdayConditions: [],
      isWeekendOnly: false,
      isActive: true,
      isLocked: false,
      createdAt: NOW,
      updatedAt: NOW,
      createdByActorId: ACTOR_ID,
      updatedByActorId: ACTOR_ID
    }
  ];
}

function createServiceHarness(seedDrafts: ReadonlyArray<RosterWizardDraft> = []) {
  const storageKey = `icu-hrm:test:wizard-audit:${crypto.randomUUID()}`;
  const auditLogRepository = new LocalStorageAuditLogRepository({
    storageKey
  });
  const biasLedgerRepository = new InMemoryBiasLedgerRepository([
    {
      id: "bias-1",
      doctorId: "doctor-a",
      effectiveMonth: "2026-06",
      balances: {
        "criteria-day-all": -1
      },
      source: "ROSTER_GENERATION",
      sourceReferenceId: "roster-prev",
      updatedAt: NOW,
      updatedByActorId: "system"
    }
  ]);
  const auditLogService = createAuditLogService({
    auditLogRepository
  });
  const biasManagementService = createBiasManagementService({
    biasCriteriaRepository: new InMemoryBiasCriteriaRepository(createCriteria()),
    biasLedgerRepository,
    weekdayPairBiasLedgerRepository: new InMemoryWeekdayPairBiasLedgerRepository()
  });
  const rosterWizardDraftRepository = new InMemoryRosterWizardDraftRepository(seedDrafts);
  const rosterWizardService = createRosterWizardService({
    rosterWizardDraftRepository,
    biasManagementService,
    auditLogService
  });

  return {
    auditLogService,
    rosterWizardService,
    cleanup() {
      removeStorageCollection(storageKey);
      window.localStorage.clear();
    }
  };
}

describe("rosterWizardService", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(NOW));
  });

  afterEach(() => {
    vi.useRealTimers();
    window.localStorage.clear();
  });

  it("creates a draft with defaults, owner, and current bias snapshot", async () => {
    const harness = createServiceHarness();

    try {
      const createdDraft = await harness.rosterWizardService.createDraft({
        rosterMonth: "2026-06",
        actorId: ACTOR_ID,
        actorRole: ACTOR_ROLE
      });

      expect(createdDraft.name).toBe("Roster Wizard 2026-06");
      expect(createdDraft.createdByActorId).toBe(ACTOR_ID);
      expect(createdDraft.status).toBe("DRAFT");
      expect(createdDraft.currentStep).toBe(1);
      expect(createdDraft.currentBiasSnapshot).toEqual([
        expect.objectContaining({
          doctorId: "doctor-a",
          effectiveMonth: "2026-06"
        })
      ]);

      const auditLogs = await harness.auditLogService.listLogs({
        entityType: "ROSTER_WIZARD_DRAFT"
      });
      expect(auditLogs.map((entry) => entry.actionType)).toEqual([
        "ROSTER_WIZARD_DRAFT_CREATED"
      ]);
    } finally {
      harness.cleanup();
    }
  });

  it("saves steps immutably and enforces admin ownership", async () => {
    const harness = createServiceHarness();

    try {
      const createdDraft = await harness.rosterWizardService.createDraft({
        rosterMonth: "2026-06",
        actorId: ACTOR_ID,
        actorRole: ACTOR_ROLE
      });

      vi.setSystemTime(new Date("2026-04-12T10:00:00.000Z"));

      const updatedDraft = await harness.rosterWizardService.saveDraftStep({
        draftId: createdDraft.id,
        currentStep: 3,
        changes: {
          name: "June Wizard",
          publicHolidayDates: ["2026-06-15"]
        },
        actorId: ACTOR_ID,
        actorRole: ACTOR_ROLE
      });

      expect(updatedDraft.name).toBe("June Wizard");
      expect(updatedDraft.currentStep).toBe(3);
      expect(updatedDraft.publicHolidayDates).toEqual(["2026-06-15"]);
      expect(updatedDraft.updatedAt).toBe("2026-04-12T10:00:00.000Z");

      await expect(
        harness.rosterWizardService.loadDraftById({
          draftId: createdDraft.id,
          actorId: "user-admin-other",
          actorRole: ACTOR_ROLE
        })
      ).rejects.toBeInstanceOf(RepositoryNotFoundError);

      await expect(
        harness.rosterWizardService.createDraft({
          rosterMonth: "2026-06",
          actorId: "user-doctor-demo",
          actorRole: "DOCTOR"
        })
      ).rejects.toBeInstanceOf(UnauthorizedError);
    } finally {
      harness.cleanup();
    }
  });

  it("supports publish, lock, unlock, and rejects invalid transitions", async () => {
    const harness = createServiceHarness();

    try {
      const createdDraft = await harness.rosterWizardService.createDraft({
        rosterMonth: "2026-06",
        actorId: ACTOR_ID,
        actorRole: ACTOR_ROLE
      });

      const publishedDraft = await harness.rosterWizardService.publishDraft({
        draftId: createdDraft.id,
        actorId: ACTOR_ID,
        actorRole: ACTOR_ROLE
      });
      const lockedDraft = await harness.rosterWizardService.lockDraft({
        draftId: createdDraft.id,
        actorId: ACTOR_ID,
        actorRole: ACTOR_ROLE
      });
      const unlockedDraft = await harness.rosterWizardService.unlockDraft({
        draftId: createdDraft.id,
        actorId: ACTOR_ID,
        actorRole: ACTOR_ROLE
      });

      expect(publishedDraft.status).toBe("PUBLISHED");
      expect(lockedDraft.status).toBe("LOCKED");
      expect(unlockedDraft.status).toBe("PUBLISHED");

      await expect(
        harness.rosterWizardService.publishDraft({
          draftId: createdDraft.id,
          actorId: ACTOR_ID,
          actorRole: ACTOR_ROLE
        })
      ).rejects.toBeInstanceOf(RepositoryNotFoundError);

      const auditLogs = await harness.auditLogService.listLogs({
        entityType: "ROSTER_WIZARD_DRAFT"
      });
      expect(auditLogs.map((entry) => entry.actionType)).toEqual(
        expect.arrayContaining([
          "ROSTER_WIZARD_DRAFT_CREATED",
          "ROSTER_WIZARD_DRAFT_PUBLISHED",
          "ROSTER_WIZARD_DRAFT_LOCKED",
          "ROSTER_WIZARD_DRAFT_UNLOCKED"
        ])
      );
      expect(auditLogs).toHaveLength(4);
    } finally {
      harness.cleanup();
    }
  });

  it("deletes drafts and records the deletion audit event", async () => {
    const harness = createServiceHarness();

    try {
      const createdDraft = await harness.rosterWizardService.createDraft({
        rosterMonth: "2026-06",
        actorId: ACTOR_ID,
        actorRole: ACTOR_ROLE
      });

      await harness.rosterWizardService.deleteDraft({
        draftId: createdDraft.id,
        actorId: ACTOR_ID,
        actorRole: ACTOR_ROLE
      });

      await expect(
        harness.rosterWizardService.loadDraftById({
          draftId: createdDraft.id,
          actorId: ACTOR_ID,
          actorRole: ACTOR_ROLE
        })
      ).rejects.toBeInstanceOf(RepositoryNotFoundError);

      const auditLogs = await harness.auditLogService.listLogs({
        entityType: "ROSTER_WIZARD_DRAFT"
      });
      expect(auditLogs.map((entry) => entry.actionType)).toContain(
        "ROSTER_WIZARD_DRAFT_DELETED"
      );
    } finally {
      harness.cleanup();
    }
  });
});
