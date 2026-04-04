import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_DUTY_LOCATION_ID,
  type ActorRole,
  type BiasCriteria,
  type BiasLedger,
  type Doctor,
  type DoctorExclusionPeriod,
  type DutyDesign,
  type DutyLocation,
  type GroupConstraintTemplate,
  type RosterWizardDraft,
  type ShiftType
} from "@/domain/models";
import {
  RepositoryNotFoundError,
  UnauthorizedError
} from "@/domain/repositories";
import { createBiasCriteriaManagementService } from "@/features/admin/services/biasCriteriaManagementService";
import { createDutyLocationManagementService } from "@/features/admin/services/dutyLocationManagementService";
import { createAuditLogService } from "@/features/audit/services/auditLogService";
import { createBiasManagementService } from "@/features/fairness/services/biasManagementService";
import { createLeaveManagementService } from "@/features/leaves/services/leaveManagementService";
import { createOffRequestService } from "@/features/offRequests/services/offRequestService";
import { createRosterWizardService } from "@/features/roster/services/rosterWizardService";
import { createShiftTypeManagementService } from "@/features/shifts/services/shiftTypeManagementService";
import {
  InMemoryBiasCriteriaRepository,
  InMemoryBiasLedgerRepository,
  InMemoryDoctorRepository,
  InMemoryDutyLocationRepository,
  InMemoryDutyDesignRepository,
  InMemoryGroupConstraintTemplateRepository,
  InMemoryLeaveRepository,
  InMemoryRosterWizardDraftRepository,
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

function createCriteriaEntry(overrides: Partial<BiasCriteria> = {}): BiasCriteria {
  return {
    id: overrides.id ?? "criteria-day-all",
    code: overrides.code ?? "DAY_ALL",
    label: overrides.label ?? "All Day Shifts",
    locationIds: overrides.locationIds ?? [],
    shiftTypeIds: overrides.shiftTypeIds ?? [],
    weekdayConditions: overrides.weekdayConditions ?? [],
    isWeekendOnly: overrides.isWeekendOnly ?? false,
    isActive: overrides.isActive ?? true,
    isLocked: overrides.isLocked ?? false,
    createdAt: overrides.createdAt ?? NOW,
    updatedAt: overrides.updatedAt ?? NOW,
    createdByActorId: overrides.createdByActorId ?? ACTOR_ID,
    updatedByActorId: overrides.updatedByActorId ?? ACTOR_ID
  };
}

function createDoctor(overrides: Partial<Doctor> = {}): Doctor {
  return {
    id: overrides.id ?? "doctor-a",
    userId: overrides.userId ?? "user-doctor-a",
    name: overrides.name ?? "Doctor A",
    phoneNumber: overrides.phoneNumber ?? "0700000001",
    uniqueIdentifier: overrides.uniqueIdentifier ?? "doctor.a",
    groupId: overrides.groupId ?? "group-a",
    weekendGroup: overrides.weekendGroup,
    isActive: overrides.isActive ?? true,
    createdAt: overrides.createdAt ?? NOW,
    updatedAt: overrides.updatedAt ?? NOW
  };
}

function createTemplate(
  overrides: Partial<GroupConstraintTemplate> = {}
): GroupConstraintTemplate {
  return {
    id: overrides.id ?? "template-a",
    code: overrides.code ?? "GROUP_A",
    label: overrides.label ?? "Group A Coverage",
    rules: {
      allowedDoctorGroupId:
        overrides.rules?.allowedDoctorGroupId ?? "group-a"
    },
    createdAt: overrides.createdAt ?? NOW,
    updatedAt: overrides.updatedAt ?? NOW
  };
}

function createDutyDesign(overrides: Partial<DutyDesign> = {}): DutyDesign {
  return {
    id: overrides.id ?? "design-weekday",
    code: overrides.code ?? "WEEKDAY",
    label: overrides.label ?? "Weekday Design",
    description: overrides.description,
    isActive: overrides.isActive ?? true,
    isHolidayDesign: overrides.isHolidayDesign ?? false,
    dutyBlocks: overrides.dutyBlocks ?? [
      {
        shiftTypeId: "shift-type-day",
        locationId: DEFAULT_DUTY_LOCATION_ID,
        doctorCount: 1
      }
    ],
    createdAt: overrides.createdAt ?? NOW,
    updatedAt: overrides.updatedAt ?? NOW
  };
}

function createDutyLocation(overrides: Partial<DutyLocation> = {}): DutyLocation {
  return {
    id: overrides.id ?? DEFAULT_DUTY_LOCATION_ID,
    code: overrides.code ?? "CCU",
    label: overrides.label ?? "CCU",
    description: overrides.description,
    isActive: overrides.isActive ?? true,
    createdAt: overrides.createdAt ?? NOW,
    updatedAt: overrides.updatedAt ?? NOW
  };
}

function createShiftType(overrides: Partial<ShiftType> = {}): ShiftType {
  return {
    id: overrides.id ?? "shift-type-day",
    code: overrides.code ?? "DAY",
    label: overrides.label ?? "Day Shift",
    startTime: overrides.startTime ?? "08:00",
    endTime: overrides.endTime ?? "20:00",
    category: overrides.category ?? "DAY",
    isActive: overrides.isActive ?? true,
    createdAt: overrides.createdAt ?? NOW,
    updatedAt: overrides.updatedAt ?? NOW
  };
}

function createBiasLedger(overrides: Partial<BiasLedger> = {}): BiasLedger {
  return {
    id: overrides.id ?? "bias-1",
    doctorId: overrides.doctorId ?? "doctor-a",
    effectiveMonth: overrides.effectiveMonth ?? "2026-06",
    balances: overrides.balances ?? {
      "criteria-day-all": -1
    },
    source: overrides.source ?? "ROSTER_GENERATION",
    sourceReferenceId: overrides.sourceReferenceId ?? "roster-prev",
    updatedAt: overrides.updatedAt ?? NOW,
    updatedByActorId: overrides.updatedByActorId ?? "system"
  };
}

function createServiceHarness(
  seedDrafts: ReadonlyArray<RosterWizardDraft> = [],
  options?: {
    readonly criteria?: ReadonlyArray<BiasCriteria>;
    readonly biasLedgers?: ReadonlyArray<BiasLedger>;
  }
) {
  const storageKey = `icu-hrm:test:wizard-audit:${crypto.randomUUID()}`;
  const auditLogRepository = new LocalStorageAuditLogRepository({
    storageKey
  });
  const rosterSnapshotRepository = new LocalStorageRosterSnapshotRepository({
    storageKey: `${storageKey}:snapshots`,
    seedData: []
  });
  const biasCriteriaRepository = new InMemoryBiasCriteriaRepository(
    options?.criteria ?? createCriteria()
  );
  const doctorRepository = new InMemoryDoctorRepository([
    createDoctor(),
    createDoctor({
      id: "doctor-b",
      userId: "user-doctor-b",
      name: "Doctor B",
      phoneNumber: "0700000002",
      uniqueIdentifier: "doctor.b",
      groupId: "group-b"
    })
  ]);
  const dutyDesignRepository = new InMemoryDutyDesignRepository([
    createDutyDesign(),
    createDutyDesign({
      id: "design-holiday",
      code: "HOLIDAY",
      label: "Holiday Design",
      isHolidayDesign: true
    }),
    createDutyDesign({
      id: "design-inactive",
      code: "INACTIVE",
      label: "Inactive Design",
      isActive: false
    })
  ]);
  const biasLedgerRepository = new InMemoryBiasLedgerRepository(
    options?.biasLedgers ?? [
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
      },
      {
        id: "bias-2",
        doctorId: "doctor-b",
        effectiveMonth: "2026-07",
        balances: {
          "criteria-day-all": 2
        },
        source: "ROSTER_GENERATION",
        sourceReferenceId: "roster-prev-july",
        updatedAt: NOW,
        updatedByActorId: "system"
      }
    ]
  );
  const auditLogService = createAuditLogService({
    auditLogRepository
  });
  const biasManagementService = createBiasManagementService({
    biasCriteriaRepository,
    biasLedgerRepository,
    weekdayPairBiasLedgerRepository: new InMemoryWeekdayPairBiasLedgerRepository()
  });
  const biasCriteriaManagementService = createBiasCriteriaManagementService({
    biasCriteriaRepository,
    biasLedgerRepository,
    doctorRepository,
    rosterSnapshotRepository,
    auditLogService
  });
  const dutyLocationManagementService = createDutyLocationManagementService({
    dutyLocationRepository: new InMemoryDutyLocationRepository([
      createDutyLocation()
    ]),
    biasCriteriaRepository,
    rosterSnapshotRepository,
    auditLogService
  });
  const shiftTypeManagementService = createShiftTypeManagementService({
    shiftTypeRepository: new InMemoryShiftTypeRepository([
      createShiftType(),
      createShiftType({
        id: "shift-type-night",
        code: "NIGHT",
        label: "Night Shift",
        startTime: "20:00",
        endTime: "08:00",
        category: "NIGHT"
      })
    ]),
    dutyDesignRepository,
    biasCriteriaRepository,
    rosterSnapshotRepository,
    auditLogService
  });
  const leaveManagementService = createLeaveManagementService({
    leaveRepository: new InMemoryLeaveRepository([])
  });
  const offRequestService = createOffRequestService({
    offRequestRepository: new LocalStorageOffRequestRepository({
      storageKey: `${storageKey}:off-requests`,
      seedData: []
    }),
    rosterSnapshotRepository
  });
  const rosterWizardDraftRepository = new InMemoryRosterWizardDraftRepository(seedDrafts);
  const rosterWizardService = createRosterWizardService({
    rosterWizardDraftRepository,
    doctorRepository,
    groupConstraintTemplateRepository: new InMemoryGroupConstraintTemplateRepository([
      createTemplate(),
      createTemplate({
        id: "template-b",
        code: "GROUP_B",
        label: "Group B Coverage",
        rules: {
          allowedDoctorGroupId: "group-b"
        }
      })
    ]),
    dutyDesignRepository,
    biasCriteriaManagementService,
    dutyLocationManagementService,
    shiftTypeManagementService,
    leaveManagementService,
    offRequestService,
    biasManagementService,
    auditLogService
  });

  return {
    auditLogService,
    rosterSnapshotRepository,
    rosterWizardService,
    cleanup() {
      removeStorageCollection(storageKey);
      removeStorageCollection(`${storageKey}:snapshots`);
      removeStorageCollection(`${storageKey}:off-requests`);
      window.localStorage.clear();
    }
  };
}

async function createSingleDayWizardDraft(
  harness: ReturnType<typeof createServiceHarness>,
  overrides: Partial<Parameters<
    ReturnType<typeof createServiceHarness>["rosterWizardService"]["saveDraftStep"]
  >[0]["changes"]> = {}
) {
  const createdDraft = await harness.rosterWizardService.createDraft({
    rosterMonth: "2026-06",
    actorId: ACTOR_ID,
    actorRole: ACTOR_ROLE
  });

  return harness.rosterWizardService.saveDraftStep({
    draftId: createdDraft.id,
    currentStep: 4,
    changes: {
      customRange: {
        startDate: "2026-06-12",
        endDate: "2026-06-12"
      },
      ...overrides
    },
    actorId: ACTOR_ID,
    actorRole: ACTOR_ROLE
  });
}

async function assignAllSingleDayShifts(
  harness: ReturnType<typeof createServiceHarness>,
  draftId: string
) {
  const preview = await harness.rosterWizardService.loadStepFourPreview({
    draftId,
    actorId: ACTOR_ID,
    actorRole: ACTOR_ROLE
  });
  const firstShift = preview.days[0]?.shifts[0];
  const secondShift = preview.days[0]?.shifts[1];

  if (!firstShift || !secondShift) {
    throw new Error("Expected two Step 4 shifts for the single-day wizard draft.");
  }

  await harness.rosterWizardService.setManualShiftAssignment({
    draftId,
    shiftId: firstShift.shiftId,
    doctorId: "doctor-a",
    actorId: ACTOR_ID,
    actorRole: ACTOR_ROLE
  });

  return harness.rosterWizardService.setManualShiftAssignment({
    draftId,
    shiftId: secondShift.shiftId,
    doctorId: "doctor-b",
    actorId: ACTOR_ID,
    actorRole: ACTOR_ROLE
  });
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
      expect(createdDraft.baseBiasSnapshot).toEqual([
        expect.objectContaining({
          doctorId: "doctor-a",
          effectiveMonth: "2026-06"
        })
      ]);
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

  it("requires admin role for wizard reads, simulation, lifecycle, and mutation methods", async () => {
    const harness = createServiceHarness();

    try {
      const createdDraft = await harness.rosterWizardService.createDraft({
        rosterMonth: "2026-06",
        actorId: ACTOR_ID,
        actorRole: ACTOR_ROLE
      });
      const doctorActor = {
        actorId: "user-doctor-demo",
        actorRole: "DOCTOR" as const
      };

      await expect(
        harness.rosterWizardService.listDraftsByAdmin(doctorActor)
      ).rejects.toBeInstanceOf(UnauthorizedError);
      await expect(
        harness.rosterWizardService.loadDraftById({
          draftId: createdDraft.id,
          ...doctorActor
        })
      ).rejects.toBeInstanceOf(UnauthorizedError);
      await expect(
        harness.rosterWizardService.saveDraftStep({
          draftId: createdDraft.id,
          currentStep: 1,
          ...doctorActor
        })
      ).rejects.toBeInstanceOf(UnauthorizedError);
      await expect(
        harness.rosterWizardService.loadStepFourPreview({
          draftId: createdDraft.id,
          ...doctorActor
        })
      ).rejects.toBeInstanceOf(UnauthorizedError);
      await expect(
        harness.rosterWizardService.loadStepFourShiftDetails({
          draftId: createdDraft.id,
          shiftId: "shift-missing",
          ...doctorActor
        })
      ).rejects.toBeInstanceOf(UnauthorizedError);
      await expect(
        harness.rosterWizardService.loadStepFiveReview({
          draftId: createdDraft.id,
          ...doctorActor
        })
      ).rejects.toBeInstanceOf(UnauthorizedError);
      await expect(
        harness.rosterWizardService.setManualShiftAssignment({
          draftId: createdDraft.id,
          shiftId: "shift-missing",
          doctorId: "doctor-a",
          ...doctorActor
        })
      ).rejects.toBeInstanceOf(UnauthorizedError);
      await expect(
        harness.rosterWizardService.publishDraft({
          draftId: createdDraft.id,
          ...doctorActor
        })
      ).rejects.toBeInstanceOf(UnauthorizedError);
      await expect(
        harness.rosterWizardService.unlockDraft({
          draftId: createdDraft.id,
          ...doctorActor
        })
      ).rejects.toBeInstanceOf(UnauthorizedError);
      await expect(
        harness.rosterWizardService.deleteDraft({
          draftId: createdDraft.id,
          ...doctorActor
        })
      ).rejects.toBeInstanceOf(UnauthorizedError);
    } finally {
      harness.cleanup();
    }
  });

  it("validates step one data, normalizes holidays, and refreshes bias snapshot when the roster month changes", async () => {
    const harness = createServiceHarness();

    try {
      const createdDraft = await harness.rosterWizardService.createDraft({
        rosterMonth: "2026-06",
        actorId: ACTOR_ID,
        actorRole: ACTOR_ROLE
      });

      const updatedDraft = await harness.rosterWizardService.saveDraftStep({
        draftId: createdDraft.id,
        currentStep: 2,
        changes: {
          rosterMonth: "2026-07",
          customRange: {
            startDate: "2026-06-29",
            endDate: "2026-07-05"
          },
          publicHolidayDates: ["2026-07-04", "2026-06-30", "2026-07-04"]
        },
        actorId: ACTOR_ID,
        actorRole: ACTOR_ROLE
      });

      expect(updatedDraft.rosterMonth).toBe("2026-07");
      expect(updatedDraft.customRange).toEqual({
        startDate: "2026-06-29",
        endDate: "2026-07-05"
      });
      expect(updatedDraft.publicHolidayDates).toEqual(["2026-06-30", "2026-07-04"]);
      expect(updatedDraft.baseBiasSnapshot).toEqual([
        expect.objectContaining({
          doctorId: "doctor-b",
          effectiveMonth: "2026-07"
        })
      ]);
      expect(updatedDraft.currentBiasSnapshot).toEqual([
        expect.objectContaining({
          doctorId: "doctor-b",
          effectiveMonth: "2026-07"
        })
      ]);

      const auditLogs = await harness.auditLogService.listLogs({
        entityType: "ROSTER_WIZARD_DRAFT"
      });
      const updatedAuditLog = auditLogs.find(
        (entry) => entry.actionType === "ROSTER_WIZARD_DRAFT_UPDATED"
      );

      expect(updatedAuditLog?.details).toMatchObject({
        rosterMonth: "2026-07",
        customRange: {
          startDate: "2026-06-29",
          endDate: "2026-07-05"
        },
        effectiveRange: {
          startDate: "2026-06-29",
          endDate: "2026-07-05"
        },
        publicHolidayDates: ["2026-06-30", "2026-07-04"]
      });
    } finally {
      harness.cleanup();
    }
  });

  it("rejects custom ranges that do not include the anchor roster month", async () => {
    const harness = createServiceHarness();

    try {
      const createdDraft = await harness.rosterWizardService.createDraft({
        rosterMonth: "2026-06",
        actorId: ACTOR_ID,
        actorRole: ACTOR_ROLE
      });

      await expect(
        harness.rosterWizardService.saveDraftStep({
          draftId: createdDraft.id,
          currentStep: 2,
          changes: {
            customRange: {
              startDate: "2026-07-10",
              endDate: "2026-07-18"
            }
          },
          actorId: ACTOR_ID,
          actorRole: ACTOR_ROLE
        })
      ).rejects.toThrow(
        "Custom range must include at least one date from roster month '2026-06'."
      );
    } finally {
      harness.cleanup();
    }
  });

  it("rejects public holidays that fall outside the effective roster range", async () => {
    const harness = createServiceHarness();

    try {
      const createdDraft = await harness.rosterWizardService.createDraft({
        rosterMonth: "2026-06",
        actorId: ACTOR_ID,
        actorRole: ACTOR_ROLE
      });

      await expect(
        harness.rosterWizardService.saveDraftStep({
          draftId: createdDraft.id,
          currentStep: 2,
          changes: {
            customRange: {
              startDate: "2026-06-28",
              endDate: "2026-07-04"
            },
            publicHolidayDates: ["2026-07-08"]
          },
          actorId: ACTOR_ID,
          actorRole: ACTOR_ROLE
        })
      ).rejects.toThrow(
        "Public holiday date '2026-07-08' must fall within the selected roster range."
      );
    } finally {
      harness.cleanup();
    }
  });

  it("validates step three mappings, preserves exact audit details, and prunes them when step one later shrinks", async () => {
    const harness = createServiceHarness();

    try {
      const createdDraft = await harness.rosterWizardService.createDraft({
        rosterMonth: "2026-06",
        actorId: ACTOR_ID,
        actorRole: ACTOR_ROLE
      });

      const mappedDraft = await harness.rosterWizardService.saveDraftStep({
        draftId: createdDraft.id,
        currentStep: 4,
        changes: {
          customRange: {
            startDate: "2026-06-01",
            endDate: "2026-07-03"
          },
          publicHolidayDates: ["2026-07-03"],
          dutyDesignAssignments: [
            {
              id: "assignment-standard",
              date: "2026-06-12",
              dutyDesignId: "design-weekday",
              isHolidayOverride: false,
              createdAt: NOW,
              updatedAt: NOW
            },
            {
              id: "assignment-holiday",
              date: "2026-07-03",
              dutyDesignId: "design-holiday",
              isHolidayOverride: true,
              createdAt: NOW,
              updatedAt: NOW
            }
          ]
        },
        actorId: ACTOR_ID,
        actorRole: ACTOR_ROLE
      });

      expect(mappedDraft.dutyDesignAssignments).toEqual([
        expect.objectContaining({
          id: "assignment-standard",
          date: "2026-06-12",
          dutyDesignId: "design-weekday",
          isHolidayOverride: false
        }),
        expect.objectContaining({
          id: "assignment-holiday",
          date: "2026-07-03",
          dutyDesignId: "design-holiday",
          isHolidayOverride: true
        })
      ]);

      const prunedDraft = await harness.rosterWizardService.saveDraftStep({
        draftId: createdDraft.id,
        currentStep: 2,
        changes: {
          customRange: {
            startDate: "2026-06-01",
            endDate: "2026-06-30"
          },
          publicHolidayDates: []
        },
        actorId: ACTOR_ID,
        actorRole: ACTOR_ROLE
      });

      expect(prunedDraft.dutyDesignAssignments).toEqual([
        expect.objectContaining({
          id: "assignment-standard",
          date: "2026-06-12",
          dutyDesignId: "design-weekday",
          isHolidayOverride: false
        })
      ]);

      const auditLogs = await harness.auditLogService.listLogs({
        entityType: "ROSTER_WIZARD_DRAFT"
      });
      const updatedAuditLogs = auditLogs.filter(
        (entry) => entry.actionType === "ROSTER_WIZARD_DRAFT_UPDATED"
      );

      expect(updatedAuditLogs).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            details: expect.objectContaining({
              dutyDesignAssignments: [
                expect.objectContaining({
                  id: "assignment-standard",
                  date: "2026-06-12",
                  dutyDesignId: "design-weekday",
                  isHolidayOverride: false
                }),
                expect.objectContaining({
                  id: "assignment-holiday",
                  date: "2026-07-03",
                  dutyDesignId: "design-holiday",
                  isHolidayOverride: true
                })
              ]
            })
          }),
          expect.objectContaining({
            details: expect.objectContaining({
              dutyDesignAssignments: [
                expect.objectContaining({
                  id: "assignment-standard",
                  date: "2026-06-12",
                  dutyDesignId: "design-weekday",
                  isHolidayOverride: false
                })
              ]
            })
          })
        ])
      );
    } finally {
      harness.cleanup();
    }
  });

  it("rejects invalid step three mappings for duplicate slots, non-holiday overrides, missing designs, and inactive designs", async () => {
    const harness = createServiceHarness();

    try {
      const createdDraft = await harness.rosterWizardService.createDraft({
        rosterMonth: "2026-06",
        actorId: ACTOR_ID,
        actorRole: ACTOR_ROLE
      });

      await expect(
        harness.rosterWizardService.saveDraftStep({
          draftId: createdDraft.id,
          currentStep: 4,
          changes: {
            publicHolidayDates: ["2026-06-20"],
            dutyDesignAssignments: [
              {
                id: "dup-a",
                date: "2026-06-10",
                dutyDesignId: "design-weekday",
                isHolidayOverride: false,
                createdAt: NOW,
                updatedAt: NOW
              },
              {
                id: "dup-b",
                date: "2026-06-10",
                dutyDesignId: "design-holiday",
                isHolidayOverride: false,
                createdAt: NOW,
                updatedAt: NOW
              }
            ]
          },
          actorId: ACTOR_ID,
          actorRole: ACTOR_ROLE
        })
      ).rejects.toThrow("Only one standard duty design can be assigned on 2026-06-10.");

      await expect(
        harness.rosterWizardService.saveDraftStep({
          draftId: createdDraft.id,
          currentStep: 4,
          changes: {
            publicHolidayDates: [],
            dutyDesignAssignments: [
              {
                id: "holiday-invalid",
                date: "2026-06-11",
                dutyDesignId: "design-holiday",
                isHolidayOverride: true,
                createdAt: NOW,
                updatedAt: NOW
              }
            ]
          },
          actorId: ACTOR_ID,
          actorRole: ACTOR_ROLE
        })
      ).rejects.toThrow(
        "Holiday override duty designs can only be assigned to public holidays. 2026-06-11 is not marked as a holiday in Step 1."
      );

      await expect(
        harness.rosterWizardService.saveDraftStep({
          draftId: createdDraft.id,
          currentStep: 4,
          changes: {
            dutyDesignAssignments: [
              {
                id: "missing-design",
                date: "2026-06-12",
                dutyDesignId: "design-missing",
                isHolidayOverride: false,
                createdAt: NOW,
                updatedAt: NOW
              }
            ]
          },
          actorId: ACTOR_ID,
          actorRole: ACTOR_ROLE
        })
      ).rejects.toThrow("Duty design 'design-missing' was not found for 2026-06-12.");

      await expect(
        harness.rosterWizardService.saveDraftStep({
          draftId: createdDraft.id,
          currentStep: 4,
          changes: {
            dutyDesignAssignments: [
              {
                id: "inactive-design",
                date: "2026-06-13",
                dutyDesignId: "design-inactive",
                isHolidayOverride: false,
                createdAt: NOW,
                updatedAt: NOW
              }
            ]
          },
          actorId: ACTOR_ID,
          actorRole: ACTOR_ROLE
        })
      ).rejects.toThrow(
        "Duty design 'Inactive Design' is inactive and cannot be assigned on 2026-06-13."
      );
    } finally {
      harness.cleanup();
    }
  });

  it("loads Step 4 preview and shift details, then persists assignment and clear actions with live bias", async () => {
    const harness = createServiceHarness();

    try {
      const createdDraft = await harness.rosterWizardService.createDraft({
        rosterMonth: "2026-06",
        actorId: ACTOR_ID,
        actorRole: ACTOR_ROLE
      });

      const configuredDraft = await harness.rosterWizardService.saveDraftStep({
        draftId: createdDraft.id,
        currentStep: 4,
        changes: {
          customRange: {
            startDate: "2026-06-12",
            endDate: "2026-06-12"
          },
          groupConstraints: [
            {
              date: "2026-06-12",
              templateId: "template-a"
            }
          ]
        },
        actorId: ACTOR_ID,
        actorRole: ACTOR_ROLE
      });

      const preview = await harness.rosterWizardService.loadStepFourPreview({
        draftId: configuredDraft.id,
        actorId: ACTOR_ID,
        actorRole: ACTOR_ROLE
      });

      expect(preview.totalSlotCount).toBe(2);
      expect(preview.assignedSlotCount).toBe(0);
      expect(preview.unassignedSlotCount).toBe(2);
      expect(preview.invalidSlotCount).toBe(0);
      expect(preview.currentBiasSnapshot).toEqual(configuredDraft.currentBiasSnapshot);

      const firstShift = preview.days[0]?.shifts[0];

      if (!firstShift) {
        throw new Error("Expected a Step 4 shift preview for assignment testing.");
      }

      const details = await harness.rosterWizardService.loadStepFourShiftDetails({
        draftId: configuredDraft.id,
        shiftId: firstShift.shiftId,
        actorId: ACTOR_ID,
        actorRole: ACTOR_ROLE
      });

      expect(details.tabs[0]).toMatchObject({
        label: "All Day Shifts"
      });
      expect(details.overallRecommendedDoctorId).toBe("doctor-a");

      const doctorBCandidate = details.tabs[0]?.doctors.find(
        (doctor) => doctor.doctorId === "doctor-b"
      );

      expect(doctorBCandidate).toMatchObject({
        isEligible: false,
        reasons: ["Doctor does not belong to the allowed group for this date."]
      });

      await expect(
        harness.rosterWizardService.setManualShiftAssignment({
          draftId: configuredDraft.id,
          shiftId: firstShift.shiftId,
          doctorId: "doctor-b",
          actorId: ACTOR_ID,
          actorRole: ACTOR_ROLE
        })
      ).rejects.toThrow("Doctor does not belong to the allowed group for this date.");

      const assignedResult =
        await harness.rosterWizardService.setManualShiftAssignment({
          draftId: configuredDraft.id,
          shiftId: firstShift.shiftId,
          doctorId: "doctor-a",
          actorId: ACTOR_ID,
          actorRole: ACTOR_ROLE
        });

      expect(assignedResult.draft.manualShiftAssignments).toEqual([
        {
          shiftId: firstShift.shiftId,
          doctorId: "doctor-a"
        }
      ]);
      expect(assignedResult.preview.assignedSlotCount).toBe(1);
      expect(
        assignedResult.draft.currentBiasSnapshot.find(
          (ledger) => ledger.doctorId === "doctor-a"
        )?.balances["criteria-day-all"]
      ).toBe(0);

      const clearedResult = await harness.rosterWizardService.setManualShiftAssignment({
        draftId: configuredDraft.id,
        shiftId: firstShift.shiftId,
        doctorId: null,
        actorId: ACTOR_ID,
        actorRole: ACTOR_ROLE
      });

      expect(clearedResult.draft.manualShiftAssignments).toEqual([]);
      expect(clearedResult.preview.assignedSlotCount).toBe(0);
      expect(
        clearedResult.draft.currentBiasSnapshot.find(
          (ledger) => ledger.doctorId === "doctor-a"
        )?.balances["criteria-day-all"]
      ).toBe(-1);
    } finally {
      harness.cleanup();
    }
  });

  it("builds Step 4 bias tabs from live matching criteria in specificity order", async () => {
    const harness = createServiceHarness([], {
      criteria: [
        createCriteriaEntry({
          id: "criteria-any-shift",
          code: "ANY_SHIFT",
          label: "Any Shift"
        }),
        createCriteriaEntry({
          id: "criteria-any-night",
          code: "ANY_NIGHT",
          label: "Any Day Night",
          shiftTypeIds: ["shift-type-night"]
        }),
        createCriteriaEntry({
          id: "criteria-monday-any",
          code: "MONDAY_ANY",
          label: "Monday Any Shift",
          weekdayConditions: ["MON"]
        }),
        createCriteriaEntry({
          id: "criteria-monday-night",
          code: "MONDAY_NIGHT",
          label: "Monday Night",
          weekdayConditions: ["MON"],
          shiftTypeIds: ["shift-type-night"]
        })
      ],
      biasLedgers: [
        createBiasLedger({
          id: "bias-a",
          doctorId: "doctor-a",
          effectiveMonth: "2026-06",
          balances: {
            "criteria-any-shift": 1,
            "criteria-any-night": 0,
            "criteria-monday-any": -1,
            "criteria-monday-night": 2
          }
        }),
        createBiasLedger({
          id: "bias-b",
          doctorId: "doctor-b",
          effectiveMonth: "2026-06",
          balances: {
            "criteria-any-shift": -1,
            "criteria-any-night": -2,
            "criteria-monday-any": 4,
            "criteria-monday-night": -3
          }
        })
      ]
    });

    try {
      const createdDraft = await harness.rosterWizardService.createDraft({
        rosterMonth: "2026-06",
        actorId: ACTOR_ID,
        actorRole: ACTOR_ROLE
      });
      const configuredDraft = await harness.rosterWizardService.saveDraftStep({
        draftId: createdDraft.id,
        currentStep: 4,
        changes: {
          customRange: {
            startDate: "2026-06-15",
            endDate: "2026-06-15"
          }
        },
        actorId: ACTOR_ID,
        actorRole: ACTOR_ROLE
      });
      const preview = await harness.rosterWizardService.loadStepFourPreview({
        draftId: configuredDraft.id,
        actorId: ACTOR_ID,
        actorRole: ACTOR_ROLE
      });
      const nightShift = preview.days[0]?.shifts.find(
        (shift) => shift.shiftTypeLabel === "Night Shift"
      );

      if (!nightShift) {
        throw new Error("Expected a Monday night shift for bias-tab testing.");
      }

      const details = await harness.rosterWizardService.loadStepFourShiftDetails({
        draftId: configuredDraft.id,
        shiftId: nightShift.shiftId,
        actorId: ACTOR_ID,
        actorRole: ACTOR_ROLE
      });

      expect(details.tabs.map((tab) => tab.label)).toEqual([
        "Monday Night",
        "Monday Any Shift",
        "Any Day Night",
        "Any Shift"
      ]);
      expect(details.tabs.map((tab) => tab.criteriaId)).toEqual([
        "criteria-monday-night",
        "criteria-monday-any",
        "criteria-any-night",
        "criteria-any-shift"
      ]);
      expect(details.tabs[0]?.doctors.filter((doctor) => doctor.isEligible)).toEqual([
        expect.objectContaining({
          doctorId: "doctor-b",
          biasValue: -3
        }),
        expect.objectContaining({
          doctorId: "doctor-a",
          biasValue: 2
        })
      ]);
      expect(details.tabs[1]?.doctors.filter((doctor) => doctor.isEligible)).toEqual([
        expect.objectContaining({
          doctorId: "doctor-a",
          biasValue: -1
        }),
        expect.objectContaining({
          doctorId: "doctor-b",
          biasValue: 4
        })
      ]);
      expect(details.tabs.map((tab) => tab.label)).not.toContain("Overall ranking");
    } finally {
      harness.cleanup();
    }
  });

  it("loads Step 5 review totals, workload, bias, holidays, and constrained dates from the Step 4 simulation", async () => {
    const harness = createServiceHarness();

    try {
      const configuredDraft = await createSingleDayWizardDraft(harness, {
        publicHolidayDates: ["2026-06-12"],
        groupConstraints: [
          {
            date: "2026-06-12",
            templateId: "template-a"
          }
        ],
        excludedDoctorPeriods: [
          {
            id: "exclude-doctor-b",
            doctorId: "doctor-b",
            startDate: "2026-06-12",
            endDate: "2026-06-12",
            reason: "Course"
          }
        ]
      });

      const review = await harness.rosterWizardService.loadStepFiveReview({
        draftId: configuredDraft.id,
        actorId: ACTOR_ID,
        actorRole: ACTOR_ROLE
      });

      expect(review.summary).toEqual({
        totalSlotCount: 2,
        assignedSlotCount: 0,
        unassignedSlotCount: 2,
        invalidAssignmentCount: 0,
        holidayCount: 1,
        constrainedDateCount: 1,
        exclusionPeriodCount: 1
      });
      expect(review.doctorWorkloadRows).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            doctorId: "doctor-a",
            totalAssignedSlotCount: 0
          }),
          expect.objectContaining({
            doctorId: "doctor-b",
            totalAssignedSlotCount: 0
          })
        ])
      );
      expect(review.biasSummaryColumns).toEqual([
        expect.objectContaining({
          criteriaId: "criteria-day-all",
          label: "All Day Shifts"
        })
      ]);
      expect(review.holidayCoverageRows).toEqual([
        expect.objectContaining({
          date: "2026-06-12",
          totalSlotCount: 2,
          assignedSlotCount: 0,
          mappingState: "LEGACY_FALLBACK"
        })
      ]);
      expect(review.groupConstraintImpactRows).toEqual([
        expect.objectContaining({
          date: "2026-06-12",
          allowedDoctorGroupId: "group-a",
          excludedDoctorCount: 1,
          totalSlotCount: 2,
          assignedSlotCount: 0
        })
      ]);
      expect(review.publishReadiness).toEqual({
        canPublish: false,
        blockingReasons: ["2 shift slots remain unassigned."]
      });
    } finally {
      harness.cleanup();
    }
  });

  it("rejects publish attempts before Step 5", async () => {
    const harness = createServiceHarness();

    try {
      const createdDraft = await harness.rosterWizardService.createDraft({
        rosterMonth: "2026-06",
        actorId: ACTOR_ID,
        actorRole: ACTOR_ROLE
      });

      await expect(
        harness.rosterWizardService.publishDraft({
          draftId: createdDraft.id,
          actorId: ACTOR_ID,
          actorRole: ACTOR_ROLE
        })
      ).rejects.toThrow("Roster wizard drafts can only be published from Step 5.");
    } finally {
      harness.cleanup();
    }
  });

  it("rejects publish when the Step 5 review still has unassigned shifts", async () => {
    const harness = createServiceHarness();

    try {
      const configuredDraft = await createSingleDayWizardDraft(harness);
      const stepFiveDraft = await harness.rosterWizardService.saveDraftStep({
        draftId: configuredDraft.id,
        currentStep: 5,
        actorId: ACTOR_ID,
        actorRole: ACTOR_ROLE
      });

      await expect(
        harness.rosterWizardService.publishDraft({
          draftId: stepFiveDraft.id,
          actorId: ACTOR_ID,
          actorRole: ACTOR_ROLE
        })
      ).rejects.toThrow("2 shift slots remain unassigned.");
    } finally {
      harness.cleanup();
    }
  });

  it("rejects publish when saved assignments become invalid in Step 5", async () => {
    const harness = createServiceHarness();

    try {
      const configuredDraft = await createSingleDayWizardDraft(harness);
      await assignAllSingleDayShifts(harness, configuredDraft.id);
      const invalidStepFiveDraft = await harness.rosterWizardService.saveDraftStep({
        draftId: configuredDraft.id,
        currentStep: 5,
        changes: {
          groupConstraints: [
            {
              date: "2026-06-12",
              templateId: "template-a"
            }
          ]
        },
        actorId: ACTOR_ID,
        actorRole: ACTOR_ROLE
      });

      const review = await harness.rosterWizardService.loadStepFiveReview({
        draftId: invalidStepFiveDraft.id,
        actorId: ACTOR_ID,
        actorRole: ACTOR_ROLE
      });

      expect(review.summary.invalidAssignmentCount).toBe(1);
      expect(review.invalidAssignmentRows).toEqual([
        expect.objectContaining({
          assignedDoctorName: "Doctor B",
          invalidReasons: ["Doctor does not belong to the allowed group for this date."]
        })
      ]);

      await expect(
        harness.rosterWizardService.publishDraft({
          draftId: invalidStepFiveDraft.id,
          actorId: ACTOR_ID,
          actorRole: ACTOR_ROLE
        })
      ).rejects.toThrow(
        "1 saved assignment is invalid and must be fixed before publishing."
      );
    } finally {
      harness.cleanup();
    }
  });

  it("publishes from Step 5 into locked status, supports unlock and republish, and leaves roster snapshots unchanged", async () => {
    const harness = createServiceHarness();

    try {
      const configuredDraft = await createSingleDayWizardDraft(harness);
      await assignAllSingleDayShifts(harness, configuredDraft.id);
      const stepFiveDraft = await harness.rosterWizardService.saveDraftStep({
        draftId: configuredDraft.id,
        currentStep: 5,
        actorId: ACTOR_ID,
        actorRole: ACTOR_ROLE
      });
      const snapshotCountBeforePublish = (
        await harness.rosterSnapshotRepository.list()
      ).length;

      const publishedDraft = await harness.rosterWizardService.publishDraft({
        draftId: stepFiveDraft.id,
        actorId: ACTOR_ID,
        actorRole: ACTOR_ROLE
      });

      await expect(
        harness.rosterWizardService.saveDraftStep({
          draftId: stepFiveDraft.id,
          currentStep: 5,
          changes: {
            name: "Should Fail While Locked"
          },
          actorId: ACTOR_ID,
          actorRole: ACTOR_ROLE
        })
      ).rejects.toThrow("Locked wizard drafts must be unlocked before editing.");

      const unlockedDraft = await harness.rosterWizardService.unlockDraft({
        draftId: stepFiveDraft.id,
        actorId: ACTOR_ID,
        actorRole: ACTOR_ROLE
      });
      const editedUnlockedDraft = await harness.rosterWizardService.saveDraftStep({
        draftId: stepFiveDraft.id,
        currentStep: 5,
        changes: {
          name: "Republished June Wizard"
        },
        actorId: ACTOR_ID,
        actorRole: ACTOR_ROLE
      });
      const republishedDraft = await harness.rosterWizardService.publishDraft({
        draftId: stepFiveDraft.id,
        actorId: ACTOR_ID,
        actorRole: ACTOR_ROLE
      });
      const snapshotCountAfterRepublish = (
        await harness.rosterSnapshotRepository.list()
      ).length;

      expect(publishedDraft.status).toBe("LOCKED");
      expect(unlockedDraft.status).toBe("PUBLISHED");
      expect(editedUnlockedDraft.status).toBe("PUBLISHED");
      expect(editedUnlockedDraft.name).toBe("Republished June Wizard");
      expect(republishedDraft.status).toBe("LOCKED");
      expect(republishedDraft.name).toBe("Republished June Wizard");
      expect(snapshotCountAfterRepublish).toBe(snapshotCountBeforePublish);

      const auditLogs = await harness.auditLogService.listLogs({
        entityType: "ROSTER_WIZARD_DRAFT"
      });
      const publishAuditLogs = auditLogs.filter(
        (entry) => entry.actionType === "ROSTER_WIZARD_DRAFT_PUBLISHED"
      );

      expect(publishAuditLogs).toHaveLength(2);
      expect(
        publishAuditLogs.map((entry) => ({
          previousStatus: entry.details.previousStatus,
          nextStatus: entry.details.nextStatus,
          assignedSlotCount: entry.details.assignedSlotCount,
          unassignedSlotCount: entry.details.unassignedSlotCount,
          invalidAssignmentCount: entry.details.invalidAssignmentCount,
          holidayCount: entry.details.holidayCount,
          constrainedDateCount: entry.details.constrainedDateCount
        }))
      ).toEqual(
        expect.arrayContaining([
          {
            previousStatus: "DRAFT",
            nextStatus: "LOCKED",
            assignedSlotCount: 2,
            unassignedSlotCount: 0,
            invalidAssignmentCount: 0,
            holidayCount: 0,
            constrainedDateCount: 0
          },
          {
            previousStatus: "PUBLISHED",
            nextStatus: "LOCKED",
            assignedSlotCount: 2,
            unassignedSlotCount: 0,
            invalidAssignmentCount: 0,
            holidayCount: 0,
            constrainedDateCount: 0
          }
        ])
      );
      expect(auditLogs.map((entry) => entry.actionType)).toEqual(
        expect.arrayContaining([
          "ROSTER_WIZARD_DRAFT_CREATED",
          "ROSTER_WIZARD_DRAFT_PUBLISHED",
          "ROSTER_WIZARD_DRAFT_UNLOCKED"
        ])
      );
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

  it("normalizes step two mappings, clips exclusions, and derives template metadata", async () => {
    const harness = createServiceHarness();

    try {
      const createdDraft = await harness.rosterWizardService.createDraft({
        rosterMonth: "2026-06",
        actorId: ACTOR_ID,
        actorRole: ACTOR_ROLE
      });

      const exclusionOutsideRange: DoctorExclusionPeriod = {
        id: "exclusion-outside",
        doctorId: "doctor-b",
        startDate: "2026-07-10",
        endDate: "2026-07-12",
        reason: "Outside"
      };

      const updatedDraft = await harness.rosterWizardService.saveDraftStep({
        draftId: createdDraft.id,
        currentStep: 3,
        changes: {
          customRange: {
            startDate: "2026-05-30",
            endDate: "2026-07-03"
          },
          groupConstraints: [
            {
              date: "2026-05-29",
              templateId: "template-a"
            },
            {
              date: "2026-06-12",
              templateId: "template-a"
            },
            {
              date: "2026-07-03",
              templateId: "template-b"
            }
          ],
          excludedDoctorPeriods: [
            {
              id: "exclusion-clipped",
              doctorId: "doctor-a",
              startDate: "2026-05-28",
              endDate: "2026-06-02",
              reason: " Travel "
            },
            exclusionOutsideRange
          ]
        },
        actorId: ACTOR_ID,
        actorRole: ACTOR_ROLE
      });

      expect(updatedDraft.groupConstraintTemplateIds).toEqual(["template-a", "template-b"]);
      expect(updatedDraft.groupConstraints).toEqual([
        {
          date: "2026-06-12",
          templateId: "template-a"
        },
        {
          date: "2026-07-03",
          templateId: "template-b"
        }
      ]);
      expect(updatedDraft.excludedDoctorPeriods).toEqual([
        {
          id: "exclusion-clipped",
          doctorId: "doctor-a",
          startDate: "2026-05-30",
          endDate: "2026-06-02",
          reason: "Travel"
        }
      ]);

      const auditLogs = await harness.auditLogService.listLogs({
        entityType: "ROSTER_WIZARD_DRAFT"
      });
      const updatedAuditLog = auditLogs.find(
        (entry) => entry.actionType === "ROSTER_WIZARD_DRAFT_UPDATED"
      );

      expect(updatedAuditLog?.details).toMatchObject({
        groupConstraintTemplateIds: ["template-a", "template-b"],
        groupConstraints: [
          {
            date: "2026-06-12",
            templateId: "template-a"
          },
          {
            date: "2026-07-03",
            templateId: "template-b"
          }
        ],
        excludedDoctorPeriods: [
          {
            id: "exclusion-clipped",
            doctorId: "doctor-a",
            startDate: "2026-05-30",
            endDate: "2026-06-02",
            reason: "Travel"
          }
        ]
      });
    } finally {
      harness.cleanup();
    }
  });

  it("rejects unknown templates, unknown doctors, and duplicate date mappings in step two", async () => {
    const harness = createServiceHarness();

    try {
      const createdDraft = await harness.rosterWizardService.createDraft({
        rosterMonth: "2026-06",
        actorId: ACTOR_ID,
        actorRole: ACTOR_ROLE
      });

      await expect(
        harness.rosterWizardService.saveDraftStep({
          draftId: createdDraft.id,
          currentStep: 2,
          changes: {
            groupConstraints: [
              {
                date: "2026-06-10",
                templateId: "missing-template"
              }
            ]
          },
          actorId: ACTOR_ID,
          actorRole: ACTOR_ROLE
        })
      ).rejects.toThrow("Group constraint template 'missing-template' was not found.");

      await expect(
        harness.rosterWizardService.saveDraftStep({
          draftId: createdDraft.id,
          currentStep: 2,
          changes: {
            excludedDoctorPeriods: [
              {
                id: "missing-doctor",
                doctorId: "doctor-missing",
                startDate: "2026-06-10",
                endDate: "2026-06-11"
              }
            ]
          },
          actorId: ACTOR_ID,
          actorRole: ACTOR_ROLE
        })
      ).rejects.toThrow("Doctor 'doctor-missing' was not found.");

      await expect(
        harness.rosterWizardService.saveDraftStep({
          draftId: createdDraft.id,
          currentStep: 2,
          changes: {
            groupConstraints: [
              {
                date: "2026-06-10",
                templateId: "template-a"
              },
              {
                date: "2026-06-10",
                templateId: "template-b"
              }
            ]
          },
          actorId: ACTOR_ID,
          actorRole: ACTOR_ROLE
        })
      ).rejects.toThrow("Only one group constraint template can be assigned to 2026-06-10.");
    } finally {
      harness.cleanup();
    }
  });
});
