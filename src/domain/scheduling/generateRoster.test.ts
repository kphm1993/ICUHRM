import { describe, expect, it } from "vitest";
import type {
  BiasCriteria,
  BiasLedger,
  Doctor,
  DutyLocation,
  Leave,
  ShiftType
} from "@/domain/models";
import { DEFAULT_DUTY_LOCATION_ID } from "@/domain/models";
import { generateRoster } from "@/domain/scheduling/generateRoster";

const NOW = "2026-04-03T08:00:00.000Z";

function createDoctor(overrides: Partial<Doctor> = {}): Doctor {
  return {
    id: overrides.id ?? "doctor-a",
    userId: overrides.userId ?? "user-a",
    name: overrides.name ?? "Doctor A",
    phoneNumber: overrides.phoneNumber ?? "0700000001",
    uniqueIdentifier: overrides.uniqueIdentifier ?? "doctor.a",
    groupId: overrides.groupId ?? "group-a",
    weekendGroup: overrides.weekendGroup ?? "A",
    isActive: overrides.isActive ?? true,
    createdAt: overrides.createdAt ?? NOW,
    updatedAt: overrides.updatedAt ?? NOW
  };
}

function createShiftType(overrides: Partial<ShiftType> = {}): ShiftType {
  return {
    id: overrides.id ?? "shift-type-day",
    code: overrides.code ?? "DAY",
    label: overrides.label ?? "Day",
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
    locationIds: overrides.locationIds ?? [DEFAULT_DUTY_LOCATION_ID],
    shiftTypeIds: overrides.shiftTypeIds ?? ["shift-type-day"],
    weekdayConditions: overrides.weekdayConditions ?? [],
    isWeekendOnly: overrides.isWeekendOnly ?? false,
    isActive: overrides.isActive ?? true,
    isLocked: overrides.isLocked ?? false,
    createdAt: overrides.createdAt ?? NOW,
    updatedAt: overrides.updatedAt ?? NOW,
    createdByActorId: overrides.createdByActorId ?? "user-admin",
    updatedByActorId: overrides.updatedByActorId ?? "user-admin"
  };
}

function createBiasLedger(overrides: Partial<BiasLedger> = {}): BiasLedger {
  return {
    id: overrides.id ?? `bias-${overrides.doctorId ?? "doctor-a"}`,
    doctorId: overrides.doctorId ?? "doctor-a",
    effectiveMonth: overrides.effectiveMonth ?? "2026-05",
    balances: overrides.balances ?? {
      "criteria-day-all": 0
    },
    source: overrides.source ?? "ROSTER_GENERATION",
    sourceReferenceId: overrides.sourceReferenceId ?? "roster-prev",
    updatedAt: overrides.updatedAt ?? NOW,
    updatedByActorId: overrides.updatedByActorId ?? "system"
  };
}

function createLeave(overrides: Partial<Leave> = {}): Leave {
  return {
    id: overrides.id ?? "leave-1",
    doctorId: overrides.doctorId ?? "doctor-b",
    startDate: overrides.startDate ?? "2026-05-12",
    endDate: overrides.endDate ?? "2026-05-12",
    reason: overrides.reason ?? "Leave",
    createdByUserId: overrides.createdByUserId ?? "user-admin",
    createdAt: overrides.createdAt ?? NOW,
    updatedAt: overrides.updatedAt ?? NOW
  };
}

describe("generateRoster", () => {
  const dayShiftType = createShiftType();
  const location = createDutyLocation();
  const criteria = createCriteria();
  const doctors = [
    createDoctor(),
    createDoctor({
      id: "doctor-b",
      userId: "user-b",
      name: "Doctor B",
      phoneNumber: "0700000002",
      uniqueIdentifier: "doctor.b",
      groupId: "group-b",
      weekendGroup: "B"
    })
  ];

  it("uses bias eligibility rather than group constraints for fair-share carry-forward", () => {
    const result = generateRoster({
      rosterId: "roster-bias-fair-share",
      range: {
        startDate: "2026-05-12",
        endDate: "2026-05-12"
      },
      doctors,
      shiftTypes: [dayShiftType],
      dutyDesigns: [],
      dutyDesignAssignments: [],
      leaves: [],
      offRequests: [],
      currentBias: [
        createBiasLedger({
          doctorId: "doctor-a"
        }),
        createBiasLedger({
          doctorId: "doctor-b"
        })
      ],
      activeBiasCriteria: [criteria],
      activeDutyLocations: [location],
      fallbackLocationId: location.id,
      allowedDoctorGroupIdByDate: {
        "2026-05-12": "group-a"
      },
      generatedByActorId: "system"
    });

    expect(result.assignments).toHaveLength(1);
    expect(result.assignments[0]?.assignedDoctorId).toBe("doctor-a");
    expect(
      result.updatedBias.find((ledger) => ledger.doctorId === "doctor-a")?.balances[
        criteria.id
      ]
    ).toBe(0.5);
    expect(
      result.updatedBias.find((ledger) => ledger.doctorId === "doctor-b")?.balances[
        criteria.id
      ]
    ).toBe(-0.5);
  });

  it("still removes leave-blocked doctors from the fair-share denominator", () => {
    const result = generateRoster({
      rosterId: "roster-bias-leave",
      range: {
        startDate: "2026-05-12",
        endDate: "2026-05-12"
      },
      doctors,
      shiftTypes: [dayShiftType],
      dutyDesigns: [],
      dutyDesignAssignments: [],
      leaves: [createLeave()],
      offRequests: [],
      currentBias: [
        createBiasLedger({
          doctorId: "doctor-a"
        }),
        createBiasLedger({
          doctorId: "doctor-b"
        })
      ],
      activeBiasCriteria: [criteria],
      activeDutyLocations: [location],
      fallbackLocationId: location.id,
      allowedDoctorGroupIdByDate: {},
      generatedByActorId: "system"
    });

    expect(result.assignments).toHaveLength(1);
    expect(result.assignments[0]?.assignedDoctorId).toBe("doctor-a");
    expect(
      result.updatedBias.find((ledger) => ledger.doctorId === "doctor-a")?.balances[
        criteria.id
      ]
    ).toBe(0);
    expect(
      result.updatedBias.find((ledger) => ledger.doctorId === "doctor-b")?.balances[
        criteria.id
      ]
    ).toBe(0);
  });
});
