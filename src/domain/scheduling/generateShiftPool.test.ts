import { describe, expect, it } from "vitest";
import type {
  DutyDesign,
  DutyDesignAssignment,
  DutyLocation,
  ShiftType
} from "@/domain/models";
import { DEFAULT_DUTY_LOCATION_ID } from "@/domain/models";
import { generateShiftPool } from "@/domain/scheduling/generateShiftPool";

const NOW = "2026-04-03T08:00:00.000Z";

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

function createDutyDesignAssignment(
  overrides: Partial<DutyDesignAssignment> = {}
): DutyDesignAssignment {
  return {
    id: overrides.id ?? "assignment-weekday",
    date: overrides.date ?? "2026-05-12",
    dutyDesignId: overrides.dutyDesignId ?? "design-weekday",
    isHolidayOverride: overrides.isHolidayOverride ?? false,
    createdAt: overrides.createdAt ?? NOW,
    updatedAt: overrides.updatedAt ?? NOW
  };
}

describe("generateShiftPool", () => {
  const dayShiftType = createShiftType();
  const nightShiftType = createShiftType({
    id: "shift-type-night",
    code: "NIGHT",
    label: "Night",
    startTime: "20:00",
    endTime: "08:00",
    category: "NIGHT"
  });
  const defaultLocation = createDutyLocation();
  const icuLocation = createDutyLocation({
    id: "duty-location-icu",
    code: "ICU",
    label: "Intensive Care Unit"
  });

  it("creates one shift per doctor slot for mapped duty blocks", () => {
    const weekdayDesign = createDutyDesign({
      dutyBlocks: [
        {
          shiftTypeId: dayShiftType.id,
          locationId: icuLocation.id,
          doctorCount: 2
        },
        {
          shiftTypeId: nightShiftType.id,
          doctorCount: 1
        }
      ]
    });

    const result = generateShiftPool({
      rosterId: "roster-1",
      range: {
        startDate: "2026-05-12",
        endDate: "2026-05-12"
      },
      shiftTypes: [dayShiftType, nightShiftType],
      dutyDesigns: [weekdayDesign],
      dutyDesignAssignments: [
        createDutyDesignAssignment({
          date: "2026-05-12",
          dutyDesignId: weekdayDesign.id
        })
      ],
      activeDutyLocations: [defaultLocation, icuLocation],
      fallbackLocationId: defaultLocation.id,
      weekendGroupSchedule: []
    });

    expect(result.shifts).toHaveLength(3);
    expect(new Set(result.shifts.map((shift) => shift.id)).size).toBe(3);

    const dayShifts = result.shifts.filter(
      (shift) => shift.shiftTypeId === dayShiftType.id
    );
    const nightShifts = result.shifts.filter(
      (shift) => shift.shiftTypeId === nightShiftType.id
    );

    expect(dayShifts).toHaveLength(2);
    expect(nightShifts).toHaveLength(1);
    expect(dayShifts.map((shift) => shift.locationId)).toEqual([
      icuLocation.id,
      icuLocation.id
    ]);
    expect(nightShifts[0]?.locationId).toBe(defaultLocation.id);
    expect(dayShifts[0]?.startTime).toBe(dayShiftType.startTime);
    expect(dayShifts[0]?.endTime).toBe(dayShiftType.endTime);
    expect(nightShifts[0]?.startTime).toBe(nightShiftType.startTime);
    expect(nightShifts[0]?.endTime).toBe(nightShiftType.endTime);

    expect(
      dayShifts.map((shift) => result.shiftMetadataById.get(shift.id)?.slotIndex)
    ).toEqual([0, 1]);
    expect(result.shiftMetadataById.get(nightShifts[0]!.id)).toMatchObject({
      source: "DUTY_DESIGN_STANDARD",
      dutyDesignId: weekdayDesign.id,
      dutyDesignBlockIndex: 1,
      slotIndex: 0
    });
  });

  it("uses the holiday override design on configured public holidays", () => {
    const weekdayDesign = createDutyDesign();
    const holidayDesign = createDutyDesign({
      id: "design-holiday",
      code: "HOLIDAY",
      label: "Holiday Design",
      isHolidayDesign: true,
      dutyBlocks: [
        {
          shiftTypeId: nightShiftType.id,
          locationId: icuLocation.id,
          doctorCount: 1
        }
      ]
    });

    const result = generateShiftPool({
      rosterId: "roster-2",
      range: {
        startDate: "2026-05-12",
        endDate: "2026-05-12"
      },
      shiftTypes: [dayShiftType, nightShiftType],
      dutyDesigns: [weekdayDesign, holidayDesign],
      dutyDesignAssignments: [
        createDutyDesignAssignment({
          id: "assignment-standard",
          date: "2026-05-12",
          dutyDesignId: weekdayDesign.id
        }),
        createDutyDesignAssignment({
          id: "assignment-holiday",
          date: "2026-05-12",
          dutyDesignId: holidayDesign.id,
          isHolidayOverride: true
        })
      ],
      publicHolidayDates: ["2026-05-12"],
      activeDutyLocations: [defaultLocation, icuLocation],
      fallbackLocationId: defaultLocation.id,
      weekendGroupSchedule: []
    });

    expect(result.shifts).toHaveLength(1);
    expect(result.shifts[0]).toMatchObject({
      date: "2026-05-12",
      shiftTypeId: nightShiftType.id,
      locationId: icuLocation.id
    });
    expect(result.shiftMetadataById.get(result.shifts[0]!.id)).toMatchObject({
      source: "DUTY_DESIGN_HOLIDAY_OVERRIDE",
      dutyDesignId: holidayDesign.id
    });
    expect(result.warnings).toEqual([]);
  });

  it("warns and keeps the standard design when a holiday date has no holiday override", () => {
    const weekdayDesign = createDutyDesign();

    const result = generateShiftPool({
      rosterId: "roster-3",
      range: {
        startDate: "2026-05-12",
        endDate: "2026-05-12"
      },
      shiftTypes: [dayShiftType, nightShiftType],
      dutyDesigns: [weekdayDesign],
      dutyDesignAssignments: [
        createDutyDesignAssignment({
          date: "2026-05-12",
          dutyDesignId: weekdayDesign.id
        })
      ],
      publicHolidayDates: ["2026-05-12"],
      activeDutyLocations: [defaultLocation],
      fallbackLocationId: defaultLocation.id,
      weekendGroupSchedule: []
    });

    expect(result.shifts).toHaveLength(1);
    expect(result.shifts[0]).toMatchObject({
      shiftTypeId: dayShiftType.id,
      locationId: defaultLocation.id
    });
    expect(result.warnings).toContain(
      "Holiday date 2026-05-12 has no holiday-override duty design assignment; standard duty design mapping will be used."
    );
  });

  it("emits follow-up warnings without auto-applying the next design", () => {
    const designA = createDutyDesign({
      id: "design-a",
      code: "DESIGN_A",
      label: "Design A",
      dutyBlocks: [
        {
          shiftTypeId: dayShiftType.id,
          locationId: defaultLocation.id,
          doctorCount: 1,
          followUpDutyDesignId: "design-b"
        }
      ]
    });
    const designB = createDutyDesign({
      id: "design-b",
      code: "DESIGN_B",
      label: "Design B"
    });
    const designC = createDutyDesign({
      id: "design-c",
      code: "DESIGN_C",
      label: "Design C"
    });

    const result = generateShiftPool({
      rosterId: "roster-4",
      range: {
        startDate: "2026-05-12",
        endDate: "2026-05-13"
      },
      shiftTypes: [dayShiftType, nightShiftType],
      dutyDesigns: [designA, designB, designC],
      dutyDesignAssignments: [
        createDutyDesignAssignment({
          id: "assignment-day-1",
          date: "2026-05-12",
          dutyDesignId: designA.id
        }),
        createDutyDesignAssignment({
          id: "assignment-day-2",
          date: "2026-05-13",
          dutyDesignId: designC.id
        })
      ],
      activeDutyLocations: [defaultLocation],
      fallbackLocationId: defaultLocation.id,
      weekendGroupSchedule: []
    });

    expect(result.warnings).toContain(
      "Duty design 'DESIGN_A' on 2026-05-12 expects follow-up design DESIGN_B on 2026-05-13, but resolved DESIGN_C."
    );
    expect(result.shifts).toHaveLength(2);
  });

  it("falls back to the legacy shift generator for unmapped dates", () => {
    const result = generateShiftPool({
      rosterId: "roster-5",
      range: {
        startDate: "2026-05-12",
        endDate: "2026-05-12"
      },
      shiftTypes: [dayShiftType, nightShiftType],
      dutyDesigns: [],
      dutyDesignAssignments: [],
      activeDutyLocations: [defaultLocation],
      fallbackLocationId: defaultLocation.id,
      weekendGroupSchedule: []
    });

    expect(result.shifts).toHaveLength(2);
    expect(
      result.shifts.map((shift) => ({
        shiftTypeId: shift.shiftTypeId,
        locationId: shift.locationId
      }))
    ).toEqual([
      {
        shiftTypeId: dayShiftType.id,
        locationId: defaultLocation.id
      },
      {
        shiftTypeId: nightShiftType.id,
        locationId: defaultLocation.id
      }
    ]);
    expect(
      result.shifts.map((shift) => result.shiftMetadataById.get(shift.id)?.source)
    ).toEqual(["LEGACY_FALLBACK", "LEGACY_FALLBACK"]);
  });
});
