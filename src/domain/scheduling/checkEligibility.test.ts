import { describe, expect, it } from "vitest";
import type { Doctor, DutyLocation, ShiftType } from "@/domain/models";
import { DEFAULT_DUTY_LOCATION_ID } from "@/domain/models";
import {
  checkBiasEligibility,
  checkShiftEligibility
} from "@/domain/scheduling/checkEligibility";
import { generateShiftPool } from "@/domain/scheduling/generateShiftPool";

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

describe("checkShiftEligibility", () => {
  it("marks doctors ineligible on blocked off-offset dates", () => {
    const dayShiftType = createShiftType();
    const shiftPool = generateShiftPool({
      rosterId: "roster-off-offset",
      range: {
        startDate: "2026-05-12",
        endDate: "2026-05-13"
      },
      shiftTypes: [dayShiftType],
      dutyDesigns: [],
      dutyDesignAssignments: [],
      activeDutyLocations: [createDutyLocation()],
      fallbackLocationId: DEFAULT_DUTY_LOCATION_ID,
      weekendGroupSchedule: []
    });
    const shiftsById = new Map(shiftPool.shifts.map((shift) => [shift.id, shift] as const));
    const blockedShift = shiftPool.shifts.find((shift) => shift.date === "2026-05-13");

    if (!blockedShift) {
      throw new Error("Expected a shift on 2026-05-13 for eligibility testing.");
    }

    const eligibility = checkShiftEligibility({
      shift: blockedShift,
      doctors: [
        createDoctor(),
        createDoctor({
          id: "doctor-b",
          userId: "user-b",
          name: "Doctor B",
          phoneNumber: "0700000002",
          uniqueIdentifier: "doctor.b",
          weekendGroup: "B"
        })
      ],
      leaves: [],
      currentAssignments: [],
      shiftsById,
      shiftMetadataById: shiftPool.shiftMetadataById,
      blockedDatesByDoctorId: new Map([
        ["doctor-a", new Set(["2026-05-13"])]
      ]),
      allowedDoctorGroupIdByDate: {},
      excludedDoctorsByDate: new Map(),
      weekendGroupSchedule: []
    });

    expect(eligibility).toEqual([
      {
        doctorId: "doctor-a",
        isEligible: false,
        reasons: ["Doctor is blocked on this date by a duty-design off-offset rule."]
      },
      {
        doctorId: "doctor-b",
        isEligible: true,
        reasons: []
      }
    ]);
  });

  it("marks doctors ineligible when a wizard exclusion blocks the shift date", () => {
    const dayShiftType = createShiftType();
    const shiftPool = generateShiftPool({
      rosterId: "roster-exclusion",
      range: {
        startDate: "2026-05-12",
        endDate: "2026-05-12"
      },
      shiftTypes: [dayShiftType],
      dutyDesigns: [],
      dutyDesignAssignments: [],
      activeDutyLocations: [createDutyLocation()],
      fallbackLocationId: DEFAULT_DUTY_LOCATION_ID,
      weekendGroupSchedule: []
    });
    const shift = shiftPool.shifts[0];

    if (!shift) {
      throw new Error("Expected a shift for wizard exclusion eligibility testing.");
    }

    const shiftsById = new Map([[shift.id, shift] as const]);
    const eligibility = checkShiftEligibility({
      shift,
      doctors: [
        createDoctor(),
        createDoctor({
          id: "doctor-b",
          userId: "user-b",
          name: "Doctor B",
          phoneNumber: "0700000002",
          uniqueIdentifier: "doctor.b",
          weekendGroup: "B"
        })
      ],
      leaves: [],
      currentAssignments: [],
      shiftsById,
      shiftMetadataById: shiftPool.shiftMetadataById,
      blockedDatesByDoctorId: new Map(),
      allowedDoctorGroupIdByDate: {},
      excludedDoctorsByDate: new Map([
        ["2026-05-12", new Set(["doctor-b"])]
      ]),
      weekendGroupSchedule: []
    });

    expect(eligibility).toEqual([
      {
        doctorId: "doctor-a",
        isEligible: true,
        reasons: []
      },
      {
        doctorId: "doctor-b",
        isEligible: false,
        reasons: ["Doctor is excluded from this date by a wizard planning rule."]
      }
    ]);
  });

  it("uses only active status, leave, and doctor exclusions for bias eligibility", () => {
    const dayShiftType = createShiftType();
    const nightShiftType = createShiftType({
      id: "shift-type-night",
      code: "NIGHT",
      label: "Night",
      startTime: "20:00",
      endTime: "08:00",
      category: "NIGHT"
    });
    const shiftPool = generateShiftPool({
      rosterId: "roster-bias-eligibility",
      range: {
        startDate: "2026-05-12",
        endDate: "2026-05-13"
      },
      shiftTypes: [dayShiftType, nightShiftType],
      dutyDesigns: [],
      dutyDesignAssignments: [],
      activeDutyLocations: [createDutyLocation()],
      fallbackLocationId: DEFAULT_DUTY_LOCATION_ID,
      weekendGroupSchedule: []
    });
    const shiftsById = new Map(shiftPool.shifts.map((shift) => [shift.id, shift] as const));
    const targetShift = shiftPool.shifts.find(
      (shift) => shift.date === "2026-05-13" && shift.shiftTypeId === dayShiftType.id
    );
    const previousNightShift = shiftPool.shifts.find(
      (shift) => shift.date === "2026-05-12" && shift.shiftTypeId === nightShiftType.id
    );

    if (!targetShift || !previousNightShift) {
      throw new Error("Expected both the target day shift and previous night shift.");
    }

    const biasEligibility = checkBiasEligibility({
      shift: targetShift,
      doctors: [
        createDoctor({
          groupId: "group-a"
        }),
        createDoctor({
          id: "doctor-b",
          userId: "user-b",
          name: "Doctor B",
          phoneNumber: "0700000002",
          uniqueIdentifier: "doctor.b",
          groupId: "group-b",
          weekendGroup: "B"
        }),
        createDoctor({
          id: "doctor-c",
          userId: "user-c",
          name: "Doctor C",
          phoneNumber: "0700000003",
          uniqueIdentifier: "doctor.c",
          groupId: "group-b",
          weekendGroup: "B"
        }),
        createDoctor({
          id: "doctor-d",
          userId: "user-d",
          name: "Doctor D",
          phoneNumber: "0700000004",
          uniqueIdentifier: "doctor.d",
          groupId: "group-b",
          weekendGroup: "B",
          isActive: false
        })
      ],
      leaves: [
        {
          id: "leave-doctor-b",
          doctorId: "doctor-b",
          startDate: "2026-05-13",
          endDate: "2026-05-13",
          reason: "Leave",
          createdByUserId: "user-admin",
          createdAt: NOW,
          updatedAt: NOW
        }
      ],
      currentAssignments: [
        {
          id: `${previousNightShift.id}:assignment`,
          rosterId: previousNightShift.rosterId,
          shiftId: previousNightShift.id,
          assignedDoctorId: "doctor-a",
          actualDoctorId: "doctor-a",
          fairnessOwnerDoctorId: "doctor-a",
          source: "AUTO",
          createdAt: NOW,
          updatedAt: NOW
        }
      ],
      shiftsById,
      shiftMetadataById: shiftPool.shiftMetadataById,
      blockedDatesByDoctorId: new Map([
        ["doctor-a", new Set(["2026-05-13"])]
      ]),
      allowedDoctorGroupIdByDate: {
        "2026-05-13": "group-b"
      },
      excludedDoctorsByDate: new Map([
        ["2026-05-13", new Set(["doctor-c"])]
      ]),
      weekendGroupSchedule: []
    });

    expect(biasEligibility).toEqual([
      {
        doctorId: "doctor-a",
        isEligible: true,
        reasons: []
      },
      {
        doctorId: "doctor-b",
        isEligible: false,
        reasons: ["Doctor is on leave for this shift date."]
      },
      {
        doctorId: "doctor-c",
        isEligible: false,
        reasons: ["Doctor is excluded from this date by a wizard planning rule."]
      },
      {
        doctorId: "doctor-d",
        isEligible: false,
        reasons: ["Doctor is inactive."]
      }
    ]);
  });
});
