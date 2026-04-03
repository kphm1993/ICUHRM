import {
  DEFAULT_DUTY_LOCATION_ID,
  type Doctor,
  type RosterSnapshot
} from "@/domain/models";
import { buildRosterCalendarViewModel } from "@/features/roster/selectors/rosterCalendarSelectors";

const EXAMPLE_DOCTORS: ReadonlyArray<Doctor> = [
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
    id: "doctor-asha-s",
    userId: "user-asha-s",
    name: "Dr. Asha Silva",
    phoneNumber: "0722222222",
    uniqueIdentifier: "asha.silva",
    weekendGroup: "B",
    isActive: true,
    createdAt: "2026-04-01T00:00:00.000Z",
    updatedAt: "2026-04-01T00:00:00.000Z"
  },
  {
    id: "doctor-raj",
    userId: "user-raj",
    name: "Dr. Raj Fernando",
    phoneNumber: "0733333333",
    uniqueIdentifier: "raj.fernando",
    weekendGroup: "A",
    isActive: true,
    createdAt: "2026-04-01T00:00:00.000Z",
    updatedAt: "2026-04-01T00:00:00.000Z"
  }
];

const EXAMPLE_SNAPSHOT: RosterSnapshot = {
  roster: {
    id: "roster-example",
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
      doctorId: "doctor-asha-s",
      name: "Dr. Asha Silva",
      uniqueIdentifier: "asha.silva",
      weekendGroup: "B",
      isActive: true
    },
    {
      doctorId: "doctor-history",
      name: "Dr. Historical Name",
      uniqueIdentifier: "historical.doctor",
      weekendGroup: "A",
      isActive: false
    }
  ],
  shifts: [
    {
      id: "shift-2026-04-10-day",
      rosterId: "roster-example",
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
      rosterId: "roster-example",
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
      rosterId: "roster-example",
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
      rosterId: "roster-example",
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
      rosterId: "roster-example",
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
    activeDoctorCount: 3,
    leaveCount: 0,
    offRequestCount: 0,
    shiftTypeCount: 2,
    firstWeekendOffGroup: "A",
    weekendGroupSchedule: [],
    activeBiasCriteria: [],
    activeDutyLocations: []
  }
};

export function runRosterCalendarMonthGridExample() {
  const viewModel = buildRosterCalendarViewModel({
    snapshot: EXAMPLE_SNAPSHOT,
    doctors: EXAMPLE_DOCTORS,
    selectedDoctorId: null
  });

  return {
    weekCount: viewModel.weeks.length,
    firstVisibleDate: viewModel.weeks[0]?.days[0]?.date ?? null,
    lastVisibleDate:
      viewModel.weeks[viewModel.weeks.length - 1]?.days[6]?.date ?? null,
    aprilTenthDayName:
      viewModel.weeks
        .flatMap((week) => week.days)
        .find((day) => day.date === "2026-04-10")
        ?.daySlot.entries[0]?.displayName ?? null,
    aprilTenthNightName:
      viewModel.weeks
        .flatMap((week) => week.days)
        .find((day) => day.date === "2026-04-10")
        ?.nightSlot.entries[0]?.displayName ?? null,
    aprilEleventhDayFallback:
      viewModel.weeks
        .flatMap((week) => week.days)
        .find((day) => day.date === "2026-04-11")
        ?.daySlot.entries[0]?.displayName ?? "-"
  };
}

export function runRosterCalendarDoctorHighlightExample() {
  const viewModel = buildRosterCalendarViewModel({
    snapshot: EXAMPLE_SNAPSHOT,
    doctors: EXAMPLE_DOCTORS,
    selectedDoctorId: "doctor-asha"
  });
  const aprilTenth = viewModel.weeks
    .flatMap((week) => week.days)
    .find((day) => day.date === "2026-04-10");

  return {
    highlightedDoctorOptions: viewModel.doctorOptions.map((option) => option.label),
    isDayHighlighted: aprilTenth?.daySlot.isHighlighted ?? false,
    isNightDimmed: aprilTenth?.nightSlot.isDimmed ?? false
  };
}

export function runRosterCalendarNameCollisionExample() {
  const viewModel = buildRosterCalendarViewModel({
    snapshot: EXAMPLE_SNAPSHOT,
    doctors: EXAMPLE_DOCTORS,
    selectedDoctorId: null
  });

  return {
    doctorOptions: viewModel.doctorOptions.map((option) => option.label)
  };
}

export function runRosterCalendarHistoricalReferenceExample() {
  const currentDoctors: ReadonlyArray<Doctor> = EXAMPLE_DOCTORS.filter(
    (doctor) => doctor.id !== "doctor-history"
  );
  const viewModel = buildRosterCalendarViewModel({
    snapshot: EXAMPLE_SNAPSHOT,
    doctors: currentDoctors,
    selectedDoctorId: "doctor-history"
  });

  return {
    doctorOptions: viewModel.doctorOptions.map((option) => option.doctorId),
    includesHistoricalDoctor: viewModel.doctorOptions.some(
      (option) => option.doctorId === "doctor-history"
    )
  };
}
