import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import {
  DEFAULT_DUTY_LOCATION_ID,
  type Doctor,
  type RosterSnapshot
} from "@/domain/models";
import { RosterCalendar } from "@/features/roster/components/RosterCalendar";

const TEST_DOCTORS: ReadonlyArray<Doctor> = [
  {
    id: "doctor-asha",
    userId: "user-asha",
    name: "Dr. Asha Perera",
    phoneNumber: "0711111111",
    uniqueIdentifier: "asha.perera",
    weekendGroup: "A",
    isActive: true,
    createdAt: "2026-04-01T00:00:00.000Z",
    updatedAt: "2026-04-01T00:00:00.000Z"
  },
  {
    id: "doctor-raj",
    userId: "user-raj",
    name: "Dr. Raj Fernando",
    phoneNumber: "0722222222",
    uniqueIdentifier: "raj.fernando",
    weekendGroup: "B",
    isActive: true,
    createdAt: "2026-04-01T00:00:00.000Z",
    updatedAt: "2026-04-01T00:00:00.000Z"
  }
];

const TEST_SNAPSHOT: RosterSnapshot = {
  roster: {
    id: "roster-test",
    period: {
      startDate: "2026-04-01",
      endDate: "2026-04-30"
    },
    status: "LOCKED",
    isDeleted: false,
    createdAt: "2026-04-01T00:00:00.000Z",
    createdByUserId: "user-admin-demo",
    generatedAt: "2026-04-01T00:00:00.000Z",
    publishedAt: "2026-04-01T01:00:00.000Z",
    lockedAt: "2026-04-01T02:00:00.000Z",
    weekendGroupSchedule: []
  },
  doctorReferences: [
    {
      doctorId: "doctor-asha",
      name: "Dr. Asha Perera",
      uniqueIdentifier: "asha.perera",
      weekendGroup: "A",
      isActive: true
    },
    {
      doctorId: "doctor-raj",
      name: "Dr. Raj Fernando",
      uniqueIdentifier: "raj.fernando",
      weekendGroup: "B",
      isActive: true
    }
  ],
  shifts: [
    {
      id: "shift-2026-04-10-day",
      rosterId: "roster-test",
      date: "2026-04-10",
      shiftTypeId: "shift-type-day",
      locationId: DEFAULT_DUTY_LOCATION_ID,
      startTime: "08:00",
      endTime: "20:00",
      type: "DAY",
      category: "WEEKDAY",
      special: "NONE",
      groupEligibility: "ALL",
      definitionSnapshot: {
        shiftTypeId: "shift-type-day",
        locationId: DEFAULT_DUTY_LOCATION_ID,
        code: "DAY",
        label: "Day",
        startTime: "08:00",
        endTime: "20:00"
      },
      createdAt: "2026-04-01T00:00:00.000Z"
    },
    {
      id: "shift-2026-04-10-night",
      rosterId: "roster-test",
      date: "2026-04-10",
      shiftTypeId: "shift-type-night",
      locationId: DEFAULT_DUTY_LOCATION_ID,
      startTime: "20:00",
      endTime: "08:00",
      type: "NIGHT",
      category: "WEEKDAY",
      special: "FRIDAY_NIGHT",
      groupEligibility: "ALL",
      definitionSnapshot: {
        shiftTypeId: "shift-type-night",
        locationId: DEFAULT_DUTY_LOCATION_ID,
        code: "NIGHT",
        label: "Night",
        startTime: "20:00",
        endTime: "08:00"
      },
      createdAt: "2026-04-01T00:00:00.000Z"
    },
    {
      id: "shift-2026-04-11-day",
      rosterId: "roster-test",
      date: "2026-04-11",
      shiftTypeId: "shift-type-day",
      locationId: DEFAULT_DUTY_LOCATION_ID,
      startTime: "08:00",
      endTime: "20:00",
      type: "DAY",
      category: "WEEKEND",
      special: "NONE",
      groupEligibility: "NOT_WEEKEND_OFF_GROUP",
      definitionSnapshot: {
        shiftTypeId: "shift-type-day",
        locationId: DEFAULT_DUTY_LOCATION_ID,
        code: "DAY",
        label: "Day",
        startTime: "08:00",
        endTime: "20:00"
      },
      createdAt: "2026-04-01T00:00:00.000Z"
    }
  ],
  assignments: [
    {
      id: "assignment-2026-04-10-day",
      rosterId: "roster-test",
      shiftId: "shift-2026-04-10-day",
      assignedDoctorId: "doctor-asha",
      actualDoctorId: "doctor-asha",
      fairnessOwnerDoctorId: "doctor-asha",
      source: "AUTO",
      createdAt: "2026-04-01T00:00:00.000Z",
      updatedAt: "2026-04-01T00:00:00.000Z"
    },
    {
      id: "assignment-2026-04-10-night",
      rosterId: "roster-test",
      shiftId: "shift-2026-04-10-night",
      assignedDoctorId: "doctor-raj",
      actualDoctorId: "doctor-raj",
      fairnessOwnerDoctorId: "doctor-raj",
      source: "AUTO",
      createdAt: "2026-04-01T00:00:00.000Z",
      updatedAt: "2026-04-01T00:00:00.000Z"
    }
  ],
  warnings: [],
  validation: {
    isValid: true,
    issues: []
  },
  updatedBias: [],
  updatedWeekdayPairBias: [],
  generatedInputSummary: {
    rosterMonth: "2026-04",
    range: {
      startDate: "2026-04-01",
      endDate: "2026-04-30"
    },
    activeDoctorCount: 2,
    leaveCount: 0,
    offRequestCount: 0,
    shiftTypeCount: 2,
    firstWeekendOffGroup: "A",
    weekendGroupSchedule: [],
    activeBiasCriteria: [],
    activeDutyLocations: []
  }
};

describe("RosterCalendar", () => {
  it("renders the week grid and assigned day and night names", () => {
    render(<RosterCalendar doctors={TEST_DOCTORS} snapshot={TEST_SNAPSHOT} />);

    expect(screen.getByText("Mon")).toBeInTheDocument();
    expect(screen.getByText("Tue")).toBeInTheDocument();
    expect(screen.getByText("Wed")).toBeInTheDocument();
    expect(screen.getByText("Thu")).toBeInTheDocument();
    expect(screen.getByText("Fri")).toBeInTheDocument();
    expect(screen.getByText("Sat")).toBeInTheDocument();
    expect(screen.getByText("Sun")).toBeInTheDocument();

    expect(screen.getAllByText("Asha").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Raj").length).toBeGreaterThan(0);
    expect(screen.getByTitle("2026-04-11 DAY: unassigned")).toBeInTheDocument();
    expect(screen.getAllByText("Weekend").length).toBeGreaterThan(0);
  });

  it("highlights the selected doctor's shifts and clears the highlight", async () => {
    const user = userEvent.setup();
    render(<RosterCalendar doctors={TEST_DOCTORS} snapshot={TEST_SNAPSHOT} />);

    const select = screen.getByRole("combobox", { name: /highlight doctor/i });
    const clearButton = screen.getByRole("button", { name: /clear/i });
    const daySlot = screen.getByTitle("2026-04-10 DAY: Dr. Asha");
    const nightSlot = screen.getByTitle("2026-04-10 NIGHT: Dr. Raj");

    expect(clearButton).toBeDisabled();
    expect(daySlot).not.toHaveClass("bg-brand-100");
    expect(nightSlot).not.toHaveClass("opacity-70");

    await user.selectOptions(select, "doctor-asha");

    expect(daySlot).toHaveClass("bg-brand-100");
    expect(daySlot).toHaveClass("border-brand-500");
    expect(nightSlot).toHaveClass("opacity-70");
    expect(clearButton).toBeEnabled();

    await user.click(clearButton);

    expect(daySlot).not.toHaveClass("bg-brand-100");
    expect(nightSlot).not.toHaveClass("opacity-70");
    expect(clearButton).toBeDisabled();
  });

  it("exposes tooltip and screen-reader labels for shift cells", () => {
    render(<RosterCalendar doctors={TEST_DOCTORS} snapshot={TEST_SNAPSHOT} />);

    const daySlot = screen.getByRole("group", {
      name: /Apr 10 day shift assigned to Dr\. Asha/i
    });
    const nightSlot = screen.getByRole("group", {
      name: /Apr 10 night shift assigned to Dr\. Raj/i
    });

    expect(daySlot).toHaveAttribute("title", "2026-04-10 DAY: Dr. Asha");
    expect(nightSlot).toHaveAttribute("title", "2026-04-10 NIGHT: Dr. Raj");
  });
});
