import { describe, expect, it } from "vitest";
import type {
  BiasCriteria,
  BiasLedger,
  Doctor,
  DutyDesign,
  DutyDesignAssignment,
  DutyLocation,
  ShiftType
} from "@/domain/models";
import { DEFAULT_DUTY_LOCATION_ID } from "@/domain/models";
import { simulateManualRosterAllocation } from "@/domain/scheduling/simulateManualRosterAllocation";

const NOW = "2026-04-20T08:00:00.000Z";

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

function createDutyLocation(overrides: Partial<DutyLocation> = {}): DutyLocation {
  return {
    id: overrides.id ?? DEFAULT_DUTY_LOCATION_ID,
    code: overrides.code ?? "CCU",
    label: overrides.label ?? "Cardiac Care Unit",
    description: overrides.description,
    isActive: overrides.isActive ?? true,
    createdAt: overrides.createdAt ?? NOW,
    updatedAt: overrides.updatedAt ?? NOW
  };
}

function createCriteria(overrides: Partial<BiasCriteria> = {}): BiasCriteria {
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
    createdByActorId: overrides.createdByActorId ?? "user-admin-demo",
    updatedByActorId: overrides.updatedByActorId ?? "user-admin-demo"
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

function createDutyDesign(overrides: Partial<DutyDesign> = {}): DutyDesign {
  return {
    id: overrides.id ?? "design-a",
    code: overrides.code ?? "DESIGN_A",
    label: overrides.label ?? "Design A",
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

function createDutyDesignAssignment(
  overrides: Partial<DutyDesignAssignment> = {}
): DutyDesignAssignment {
  return {
    id: overrides.id ?? "assignment-1",
    date: overrides.date ?? "2026-06-12",
    dutyDesignId: overrides.dutyDesignId ?? "design-a",
    isHolidayOverride: overrides.isHolidayOverride ?? false,
    createdAt: overrides.createdAt ?? NOW,
    updatedAt: overrides.updatedAt ?? NOW
  };
}

describe("simulateManualRosterAllocation", () => {
  const dayShiftType = createShiftType();
  const nightShiftType = createShiftType({
    id: "shift-type-night",
    code: "NIGHT",
    label: "Night Shift",
    startTime: "20:00",
    endTime: "08:00",
    category: "NIGHT"
  });
  const location = createDutyLocation();
  const criteria = [createCriteria()];

  it("keeps shift ids stable and applies group constraints plus exclusions to eligibility", () => {
    const input = {
      rosterId: "wizard-draft-1",
      rosterMonth: "2026-06" as const,
      actorId: "user-admin-demo",
      range: {
        startDate: "2026-06-12" as const,
        endDate: "2026-06-12" as const
      },
      doctors: [
        createDoctor(),
        createDoctor({
          id: "doctor-b",
          userId: "user-doctor-b",
          name: "Doctor B",
          phoneNumber: "0700000002",
          uniqueIdentifier: "doctor.b",
          groupId: "group-b"
        })
      ],
      shiftTypes: [dayShiftType, nightShiftType],
      dutyDesigns: [] as ReadonlyArray<DutyDesign>,
      dutyDesignAssignments: [] as ReadonlyArray<DutyDesignAssignment>,
      publicHolidayDates: [] as ReadonlyArray<string>,
      leaves: [],
      offRequests: [],
      baseBiasSnapshot: [createBiasLedger()],
      activeBiasCriteria: criteria,
      activeDutyLocations: [location],
      fallbackLocationId: location.id,
      allowedDoctorGroupIdByDate: {
        "2026-06-12": "group-a"
      },
      excludedDoctorsByDate: new Map([
        ["2026-06-12", new Set(["doctor-b"])]
      ]),
      manualShiftAssignments: [] as const
    };

    const firstSimulation = simulateManualRosterAllocation(input);
    const secondSimulation = simulateManualRosterAllocation(input);

    expect(firstSimulation.shifts.map((shift) => shift.id)).toEqual(
      secondSimulation.shifts.map((shift) => shift.id)
    );

    const dayShift = firstSimulation.shifts.find(
      (shift) => shift.shiftTypeId === dayShiftType.id
    );

    if (!dayShift) {
      throw new Error("Expected a generated day shift for Step 4 simulation.");
    }

    const dayShiftState = firstSimulation.shiftStatesById.get(dayShift.id);

    expect(dayShiftState?.eligibility).toEqual([
      {
        doctorId: "doctor-a",
        isEligible: true,
        reasons: []
      },
      {
        doctorId: "doctor-b",
        isEligible: false,
        reasons: [
          "Doctor does not belong to the allowed group for this date.",
          "Doctor is excluded from this date by a wizard planning rule."
        ]
      }
    ]);
  });

  it("uses carried bias as a weighted priority signal for Step 4 recommendations", () => {
    const simulation = simulateManualRosterAllocation({
      rosterId: "wizard-draft-bias-priority",
      rosterMonth: "2026-06",
      actorId: "user-admin-demo",
      range: {
        startDate: "2026-06-12",
        endDate: "2026-06-12"
      },
      doctors: [
        createDoctor(),
        createDoctor({
          id: "doctor-b",
          userId: "user-doctor-b",
          name: "Doctor B",
          phoneNumber: "0700000002",
          uniqueIdentifier: "doctor.b",
          groupId: "group-a"
        })
      ],
      shiftTypes: [dayShiftType],
      dutyDesigns: [],
      dutyDesignAssignments: [],
      publicHolidayDates: [],
      leaves: [],
      offRequests: [],
      baseBiasSnapshot: [
        createBiasLedger({
          doctorId: "doctor-a",
          balances: {
            "criteria-day-all": 2
          }
        }),
        createBiasLedger({
          id: "bias-2",
          doctorId: "doctor-b",
          balances: {
            "criteria-day-all": -2
          }
        })
      ],
      activeBiasCriteria: criteria,
      activeDutyLocations: [location],
      fallbackLocationId: location.id,
      allowedDoctorGroupIdByDate: {},
      excludedDoctorsByDate: new Map(),
      manualShiftAssignments: []
    });

    const firstShiftState = simulation.shiftStatesById.get(simulation.shifts[0]!.id);

    expect(firstShiftState?.overallRecommendedDoctorId).toBe("doctor-b");
    expect(firstShiftState?.candidateScores.map((candidate) => candidate.doctorId)).toEqual([
      "doctor-b",
      "doctor-a"
    ]);
  });

  it("recomputes live bias and blocks downstream dates when off-offset rules apply", () => {
    const design = createDutyDesign({
      dutyBlocks: [
        {
          shiftTypeId: dayShiftType.id,
          locationId: location.id,
          doctorCount: 1,
          offOffsetDays: 1
        }
      ]
    });
    const assignments = [
      createDutyDesignAssignment({
        date: "2026-06-15",
        dutyDesignId: design.id
      }),
      createDutyDesignAssignment({
        id: "assignment-2",
        date: "2026-06-16",
        dutyDesignId: design.id
      })
    ];
    const seedSimulation = simulateManualRosterAllocation({
      rosterId: "wizard-draft-2",
      rosterMonth: "2026-06",
      actorId: "user-admin-demo",
      range: {
        startDate: "2026-06-15",
        endDate: "2026-06-16"
      },
      doctors: [
        createDoctor(),
        createDoctor({
          id: "doctor-b",
          userId: "user-doctor-b",
          name: "Doctor B",
          phoneNumber: "0700000002",
          uniqueIdentifier: "doctor.b",
          groupId: "group-a"
        })
      ],
      shiftTypes: [dayShiftType],
      dutyDesigns: [design],
      dutyDesignAssignments: assignments,
      publicHolidayDates: [],
      leaves: [],
      offRequests: [],
      baseBiasSnapshot: [createBiasLedger()],
      activeBiasCriteria: criteria,
      activeDutyLocations: [location],
      fallbackLocationId: location.id,
      allowedDoctorGroupIdByDate: {},
      excludedDoctorsByDate: new Map(),
      manualShiftAssignments: []
    });
    const firstShiftId = seedSimulation.shifts.find(
      (shift) => shift.date === "2026-06-15"
    )?.id;

    if (!firstShiftId) {
      throw new Error("Expected the initial Step 4 shift to exist.");
    }

    const withAssignment = simulateManualRosterAllocation({
      rosterId: "wizard-draft-2",
      rosterMonth: "2026-06",
      actorId: "user-admin-demo",
      range: {
        startDate: "2026-06-15",
        endDate: "2026-06-16"
      },
      doctors: [
        createDoctor(),
        createDoctor({
          id: "doctor-b",
          userId: "user-doctor-b",
          name: "Doctor B",
          phoneNumber: "0700000002",
          uniqueIdentifier: "doctor.b",
          groupId: "group-a"
        })
      ],
      shiftTypes: [dayShiftType],
      dutyDesigns: [design],
      dutyDesignAssignments: assignments,
      publicHolidayDates: [],
      leaves: [],
      offRequests: [],
      baseBiasSnapshot: [createBiasLedger()],
      activeBiasCriteria: criteria,
      activeDutyLocations: [location],
      fallbackLocationId: location.id,
      allowedDoctorGroupIdByDate: {},
      excludedDoctorsByDate: new Map(),
      manualShiftAssignments: [
        {
          shiftId: firstShiftId,
          doctorId: "doctor-a"
        }
      ]
    });

    expect(
      withAssignment.currentBiasSnapshot.find((ledger) => ledger.doctorId === "doctor-a")
        ?.balances["criteria-day-all"]
    ).toBe(0);

    const blockedShiftState = Array.from(withAssignment.shiftStatesById.values()).find(
      (shiftState) => shiftState.shift.date === "2026-06-16"
    );
    const blockedDoctorDecision = blockedShiftState?.eligibility.find(
      (decision) => decision.doctorId === "doctor-a"
    );

    expect(blockedDoctorDecision).toEqual({
      doctorId: "doctor-a",
      isEligible: false,
      reasons: ["Doctor is blocked on this date by a duty-design off-offset rule."]
    });

    const clearedSimulation = simulateManualRosterAllocation({
      rosterId: "wizard-draft-2",
      rosterMonth: "2026-06",
      actorId: "user-admin-demo",
      range: {
        startDate: "2026-06-15",
        endDate: "2026-06-16"
      },
      doctors: [
        createDoctor(),
        createDoctor({
          id: "doctor-b",
          userId: "user-doctor-b",
          name: "Doctor B",
          phoneNumber: "0700000002",
          uniqueIdentifier: "doctor.b",
          groupId: "group-a"
        })
      ],
      shiftTypes: [dayShiftType],
      dutyDesigns: [design],
      dutyDesignAssignments: assignments,
      publicHolidayDates: [],
      leaves: [],
      offRequests: [],
      baseBiasSnapshot: [createBiasLedger()],
      activeBiasCriteria: criteria,
      activeDutyLocations: [location],
      fallbackLocationId: location.id,
      allowedDoctorGroupIdByDate: {},
      excludedDoctorsByDate: new Map(),
      manualShiftAssignments: []
    });

    expect(
      clearedSimulation.currentBiasSnapshot.find((ledger) => ledger.doctorId === "doctor-a")
        ?.balances["criteria-day-all"]
    ).toBe(-1);
  });

  it("preserves saved assignments for existing shifts and marks inactive doctors as invalid", () => {
    const seedSimulation = simulateManualRosterAllocation({
      rosterId: "wizard-draft-3",
      rosterMonth: "2026-06",
      actorId: "user-admin-demo",
      range: {
        startDate: "2026-06-12",
        endDate: "2026-06-12"
      },
      doctors: [
        createDoctor({
          isActive: false
        })
      ],
      shiftTypes: [dayShiftType, nightShiftType],
      dutyDesigns: [],
      dutyDesignAssignments: [],
      publicHolidayDates: [],
      leaves: [],
      offRequests: [],
      baseBiasSnapshot: [createBiasLedger()],
      activeBiasCriteria: criteria,
      activeDutyLocations: [location],
      fallbackLocationId: location.id,
      allowedDoctorGroupIdByDate: {},
      excludedDoctorsByDate: new Map(),
      manualShiftAssignments: []
    });
    const firstShiftId = seedSimulation.shifts[0]?.id;

    if (!firstShiftId) {
      throw new Error("Expected a generated shift for invalid-assignment testing.");
    }

    const simulation = simulateManualRosterAllocation({
      rosterId: "wizard-draft-3",
      rosterMonth: "2026-06",
      actorId: "user-admin-demo",
      range: {
        startDate: "2026-06-12",
        endDate: "2026-06-12"
      },
      doctors: [
        createDoctor({
          isActive: false
        })
      ],
      shiftTypes: [dayShiftType, nightShiftType],
      dutyDesigns: [],
      dutyDesignAssignments: [],
      publicHolidayDates: [],
      leaves: [],
      offRequests: [],
      baseBiasSnapshot: [createBiasLedger()],
      activeBiasCriteria: criteria,
      activeDutyLocations: [location],
      fallbackLocationId: location.id,
      allowedDoctorGroupIdByDate: {},
      excludedDoctorsByDate: new Map(),
      manualShiftAssignments: [
        {
          shiftId: firstShiftId,
          doctorId: "doctor-a"
        }
      ]
    });

    expect(simulation.normalizedManualShiftAssignments).toEqual([
      {
        shiftId: firstShiftId,
        doctorId: "doctor-a"
      }
    ]);

    const invalidShiftState = simulation.shiftStatesById.get(firstShiftId);

    expect(invalidShiftState?.assignmentStatus).toBe("INVALID");
    expect(invalidShiftState?.invalidReasons).toEqual(["Doctor is inactive."]);
  });
});
