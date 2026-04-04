import { describe, expect, it } from "vitest";
import type { Doctor, DutyLocation, ShiftType } from "@/domain/models";
import { DEFAULT_DUTY_LOCATION_ID } from "@/domain/models";
import { checkShiftEligibility } from "@/domain/scheduling/checkEligibility";
import { generateShiftPool } from "@/domain/scheduling/generateShiftPool";

const NOW = "2026-04-03T08:00:00.000Z";

function createDoctor(overrides: Partial<Doctor> = {}): Doctor {
  return {
    id: overrides.id ?? "doctor-a",
    userId: overrides.userId ?? "user-a",
    name: overrides.name ?? "Doctor A",
    phoneNumber: overrides.phoneNumber ?? "0700000001",
    uniqueIdentifier: overrides.uniqueIdentifier ?? "doctor.a",
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
});
