import type {
  Assignment,
  BiasLedger,
  Doctor,
  Leave,
  OffRequest,
  Shift,
  ShiftType,
  WeekdayPairBiasLedger,
  WeekendGroupScheduleEntry
} from "@/domain/models";
import { checkShiftEligibility } from "@/domain/scheduling/checkEligibility";
import { resolveShiftWeekdayPairBiasBucket } from "@/domain/scheduling/biasBuckets";
import { DEFAULT_SCHEDULING_ENGINE_CONFIG } from "@/domain/scheduling/config";
import {
  initializeFairnessWorkingState,
  recordAssignmentForShift
} from "@/domain/scheduling/fairnessState";
import { generateRoster } from "@/domain/scheduling/generateRoster";
import { generateShiftPool } from "@/domain/scheduling/generateShiftPool";
import { scoreCandidates } from "@/domain/scheduling/scoreCandidates";
import { validateGeneratedRoster } from "@/domain/scheduling/validateRoster";

const EXAMPLE_SHIFT_TYPES: ReadonlyArray<ShiftType> = [
  {
    id: "shift-type-day",
    code: "DAY",
    label: "Day",
    startTime: "08:00",
    endTime: "20:00",
    defaultKind: "DAY",
    isActive: true,
    createdAt: "2026-04-01T00:00:00.000Z",
    updatedAt: "2026-04-01T00:00:00.000Z"
  },
  {
    id: "shift-type-night",
    code: "NIGHT",
    label: "Night",
    startTime: "20:00",
    endTime: "08:00",
    defaultKind: "NIGHT",
    isActive: true,
    createdAt: "2026-04-01T00:00:00.000Z",
    updatedAt: "2026-04-01T00:00:00.000Z"
  }
];

const EXAMPLE_WEEKEND_SCHEDULE: ReadonlyArray<WeekendGroupScheduleEntry> = [
  {
    weekendStartDate: "2026-04-04",
    offGroup: "A"
  }
];

const CLASSIFICATION_SHIFTS = generateShiftPool({
  rosterId: "example-roster",
  range: {
    startDate: "2026-04-03",
    endDate: "2026-04-05"
  },
  shiftTypes: EXAMPLE_SHIFT_TYPES,
  weekendGroupSchedule: EXAMPLE_WEEKEND_SCHEDULE
});

const CLASSIFICATION_SHIFTS_BY_ID = new Map(
  CLASSIFICATION_SHIFTS.map((shift) => [shift.id, shift] as const)
);

const WEEKDAY_PAIR_CLASSIFICATION_SHIFTS = generateShiftPool({
  rosterId: "weekday-pair-example-roster",
  range: {
    startDate: "2026-04-06",
    endDate: "2026-04-10"
  },
  shiftTypes: EXAMPLE_SHIFT_TYPES,
  weekendGroupSchedule: EXAMPLE_WEEKEND_SCHEDULE
});

const REST_CONSTRAINT_SHIFTS = generateShiftPool({
  rosterId: "rest-constraint-example-roster",
  range: {
    startDate: "2026-04-09",
    endDate: "2026-04-13"
  },
  shiftTypes: EXAMPLE_SHIFT_TYPES,
  weekendGroupSchedule: EXAMPLE_WEEKEND_SCHEDULE
});

const REST_CONSTRAINT_SHIFTS_BY_ID = new Map(
  REST_CONSTRAINT_SHIFTS.map((shift) => [shift.id, shift] as const)
);

function findExampleShift(date: string, code: string): Shift {
  const shift = CLASSIFICATION_SHIFTS.find(
    (entry) => entry.date === date && entry.definitionSnapshot.code === code
  );

  if (!shift) {
    throw new Error(`Example shift ${date}/${code} could not be created.`);
  }

  return shift;
}

function findWeekdayPairExampleShift(date: string, code: string): Shift {
  const shift = WEEKDAY_PAIR_CLASSIFICATION_SHIFTS.find(
    (entry) => entry.date === date && entry.definitionSnapshot.code === code
  );

  if (!shift) {
    throw new Error(`Weekday pair example shift ${date}/${code} could not be created.`);
  }

  return shift;
}

function findRestConstraintExampleShift(date: string, code: string): Shift {
  const shift = REST_CONSTRAINT_SHIFTS.find(
    (entry) => entry.date === date && entry.definitionSnapshot.code === code
  );

  if (!shift) {
    throw new Error(`Rest example shift ${date}/${code} could not be created.`);
  }

  return shift;
}

const EXAMPLE_DOCTORS: ReadonlyArray<Doctor> = [
  {
    id: "doctor-a",
    userId: "user-a",
    name: "Doctor A",
    phoneNumber: "0700000001",
    uniqueIdentifier: "doctor.a",
    weekendGroup: "A",
    isActive: true,
    createdAt: "2026-04-01T00:00:00.000Z",
    updatedAt: "2026-04-01T00:00:00.000Z"
  },
  {
    id: "doctor-b",
    userId: "user-b",
    name: "Doctor B",
    phoneNumber: "0700000002",
    uniqueIdentifier: "doctor.b",
    weekendGroup: "B",
    isActive: true,
    createdAt: "2026-04-01T00:00:00.000Z",
    updatedAt: "2026-04-01T00:00:00.000Z"
  }
];

const EXAMPLE_BIAS_LEDGER: ReadonlyArray<BiasLedger> = EXAMPLE_DOCTORS.map((doctor) => ({
  id: `bias-${doctor.id}`,
  doctorId: doctor.id,
  effectiveMonth: "2026-03",
  balance: {
    weekdayDay: 0,
    weekdayNight: 0,
    weekendDay: 0,
    weekendNight: 0
  },
  source: "ROSTER_GENERATION",
  sourceReferenceId: "roster-previous",
  updatedAt: "2026-03-31T23:59:00.000Z",
  updatedByActorId: "system"
}));

const EXAMPLE_WEEKDAY_PAIR_BIAS_LEDGER: ReadonlyArray<WeekdayPairBiasLedger> =
  EXAMPLE_DOCTORS.map((doctor) => ({
    id: `pair-bias-${doctor.id}`,
    doctorId: doctor.id,
    effectiveMonth: "2026-03",
    balance: {
      mondayDay: 0,
      mondayNight: 0,
      tuesdayDay: 0,
      tuesdayNight: 0,
      wednesdayDay: 0,
      wednesdayNight: 0,
      thursdayDay: 0,
      thursdayNight: 0,
      fridayDay: 0,
      fridayNight: 0
    },
    source: "ROSTER_GENERATION",
    sourceReferenceId: "roster-previous",
    updatedAt: "2026-03-31T23:59:00.000Z",
    updatedByActorId: "system"
  }));

const LEAVE_EXAMPLE_LEAVES: ReadonlyArray<Leave> = [
  {
    id: "leave-doctor-a",
    doctorId: "doctor-a",
    startDate: "2026-04-03",
    endDate: "2026-04-03",
    reason: "Example leave",
    createdByUserId: "user-admin",
    createdAt: "2026-04-01T00:00:00.000Z",
    updatedAt: "2026-04-01T00:00:00.000Z"
  }
];

const EMPTY_OFF_REQUESTS: ReadonlyArray<OffRequest> = [];

export const schedulingClassificationExamples = {
  fridayNight: {
    shiftId: findExampleShift("2026-04-03", "NIGHT").id,
    category: findExampleShift("2026-04-03", "NIGHT").category,
    special: findExampleShift("2026-04-03", "NIGHT").special
  },
  saturdayDay: {
    shiftId: findExampleShift("2026-04-04", "DAY").id,
    category: findExampleShift("2026-04-04", "DAY").category,
    special: findExampleShift("2026-04-04", "DAY").special
  },
  sundayNight: {
    shiftId: findExampleShift("2026-04-05", "NIGHT").id,
    category: findExampleShift("2026-04-05", "NIGHT").category,
    special: findExampleShift("2026-04-05", "NIGHT").special
  }
};

export const weekdayPairMappingExamples = {
  mondayDay: resolveShiftWeekdayPairBiasBucket(
    findWeekdayPairExampleShift("2026-04-06", "DAY")
  ),
  fridayNight: resolveShiftWeekdayPairBiasBucket(
    findWeekdayPairExampleShift("2026-04-10", "NIGHT")
  ),
  saturdayDay: resolveShiftWeekdayPairBiasBucket(
    findExampleShift("2026-04-04", "DAY")
  )
};

export const leaveExclusionExample = checkShiftEligibility({
  shift: findExampleShift("2026-04-03", "DAY"),
  doctors: EXAMPLE_DOCTORS,
  leaves: LEAVE_EXAMPLE_LEAVES,
  currentAssignments: [],
  shiftsById: CLASSIFICATION_SHIFTS_BY_ID,
  weekendGroupSchedule: EXAMPLE_WEEKEND_SCHEDULE
});

export const weekendGroupExclusionExample = checkShiftEligibility({
  shift: findExampleShift("2026-04-04", "DAY"),
  doctors: EXAMPLE_DOCTORS,
  leaves: [],
  currentAssignments: [],
  shiftsById: CLASSIFICATION_SHIFTS_BY_ID,
  weekendGroupSchedule: EXAMPLE_WEEKEND_SCHEDULE
});

const sameDayDayAssignment: Assignment = {
  id: "assignment-saturday-day-doctor-b",
  rosterId: "example-roster",
  shiftId: findExampleShift("2026-04-04", "DAY").id,
  assignedDoctorId: "doctor-b",
  actualDoctorId: "doctor-b",
  fairnessOwnerDoctorId: "doctor-b",
  source: "AUTO",
  createdAt: "2026-04-01T00:00:00.000Z",
  updatedAt: "2026-04-01T00:00:00.000Z"
};

export const oneShiftPerDayEligibilityExample = {
  saturdayNight: checkShiftEligibility({
    shift: findExampleShift("2026-04-04", "NIGHT"),
    doctors: EXAMPLE_DOCTORS,
    leaves: [],
    currentAssignments: [sameDayDayAssignment],
    shiftsById: CLASSIFICATION_SHIFTS_BY_ID,
    weekendGroupSchedule: EXAMPLE_WEEKEND_SCHEDULE
  }),
  sundayNight: checkShiftEligibility({
    shift: findExampleShift("2026-04-05", "NIGHT"),
    doctors: EXAMPLE_DOCTORS,
    leaves: [],
    currentAssignments: [sameDayDayAssignment],
    shiftsById: CLASSIFICATION_SHIFTS_BY_ID,
    weekendGroupSchedule: EXAMPLE_WEEKEND_SCHEDULE
  })
};

const thursdayNightAssignment: Assignment = {
  id: "assignment-thursday-night-doctor-b",
  rosterId: "rest-constraint-example-roster",
  shiftId: findRestConstraintExampleShift("2026-04-09", "NIGHT").id,
  assignedDoctorId: "doctor-b",
  actualDoctorId: "doctor-b",
  fairnessOwnerDoctorId: "doctor-b",
  source: "AUTO",
  createdAt: "2026-04-01T00:00:00.000Z",
  updatedAt: "2026-04-01T00:00:00.000Z"
};

const sundayNightAssignment: Assignment = {
  id: "assignment-sunday-night-doctor-b",
  rosterId: "rest-constraint-example-roster",
  shiftId: findRestConstraintExampleShift("2026-04-12", "NIGHT").id,
  assignedDoctorId: "doctor-b",
  actualDoctorId: "doctor-b",
  fairnessOwnerDoctorId: "doctor-b",
  source: "AUTO",
  createdAt: "2026-04-01T00:00:00.000Z",
  updatedAt: "2026-04-01T00:00:00.000Z"
};

export const restAfterNightEligibilityExample = {
  fridayDayBlocked: checkShiftEligibility({
    shift: findRestConstraintExampleShift("2026-04-10", "DAY"),
    doctors: [EXAMPLE_DOCTORS[1]],
    leaves: [],
    currentAssignments: [thursdayNightAssignment],
    shiftsById: REST_CONSTRAINT_SHIFTS_BY_ID,
    weekendGroupSchedule: EXAMPLE_WEEKEND_SCHEDULE
  }),
  fridayNightBlocked: checkShiftEligibility({
    shift: findRestConstraintExampleShift("2026-04-10", "NIGHT"),
    doctors: [EXAMPLE_DOCTORS[1]],
    leaves: [],
    currentAssignments: [thursdayNightAssignment],
    shiftsById: REST_CONSTRAINT_SHIFTS_BY_ID,
    weekendGroupSchedule: EXAMPLE_WEEKEND_SCHEDULE
  }),
  saturdayDayAllowed: checkShiftEligibility({
    shift: findRestConstraintExampleShift("2026-04-11", "DAY"),
    doctors: [EXAMPLE_DOCTORS[1]],
    leaves: [],
    currentAssignments: [thursdayNightAssignment],
    shiftsById: REST_CONSTRAINT_SHIFTS_BY_ID,
    weekendGroupSchedule: EXAMPLE_WEEKEND_SCHEDULE
  }),
  mondayDayAfterSundayNightBlocked: checkShiftEligibility({
    shift: findRestConstraintExampleShift("2026-04-13", "DAY"),
    doctors: [EXAMPLE_DOCTORS[1]],
    leaves: [],
    currentAssignments: [sundayNightAssignment],
    shiftsById: REST_CONSTRAINT_SHIFTS_BY_ID,
    weekendGroupSchedule: EXAMPLE_WEEKEND_SCHEDULE
  }),
  mondayNightAfterSundayNightBlocked: checkShiftEligibility({
    shift: findRestConstraintExampleShift("2026-04-13", "NIGHT"),
    doctors: [EXAMPLE_DOCTORS[1]],
    leaves: [],
    currentAssignments: [sundayNightAssignment],
    shiftsById: REST_CONSTRAINT_SHIFTS_BY_ID,
    weekendGroupSchedule: EXAMPLE_WEEKEND_SCHEDULE
  })
};

const mondayDayShift = findWeekdayPairExampleShift("2026-04-06", "DAY");
const tuesdayDayShift = findWeekdayPairExampleShift("2026-04-07", "DAY");

const weekdayPairLoadFairnessState = recordAssignmentForShift(
  recordAssignmentForShift(
    initializeFairnessWorkingState(EXAMPLE_DOCTORS),
    mondayDayShift,
    "doctor-a"
  ),
  tuesdayDayShift,
  "doctor-b"
);

export const weekdayPairLoadScoringExample = scoreCandidates({
  shift: mondayDayShift,
  eligibility: EXAMPLE_DOCTORS.map((doctor) => ({
    doctorId: doctor.id,
    isEligible: true,
    reasons: []
  })),
  currentBias: EXAMPLE_BIAS_LEDGER,
  currentWeekdayPairBias: EXAMPLE_WEEKDAY_PAIR_BIAS_LEDGER,
  offRequests: EMPTY_OFF_REQUESTS,
  fairnessState: weekdayPairLoadFairnessState,
  config: DEFAULT_SCHEDULING_ENGINE_CONFIG
});

const primaryDominanceWeekdayPairBias: ReadonlyArray<WeekdayPairBiasLedger> = [
  {
    ...EXAMPLE_WEEKDAY_PAIR_BIAS_LEDGER[0],
    balance: {
      ...EXAMPLE_WEEKDAY_PAIR_BIAS_LEDGER[0].balance,
      mondayDay: -3
    }
  },
  EXAMPLE_WEEKDAY_PAIR_BIAS_LEDGER[1]
];

const primaryDominanceBias: ReadonlyArray<BiasLedger> = [
  {
    ...EXAMPLE_BIAS_LEDGER[0],
    balance: {
      ...EXAMPLE_BIAS_LEDGER[0].balance,
      weekdayDay: 1
    }
  },
  EXAMPLE_BIAS_LEDGER[1]
];

export const primaryBiasDominanceExample = scoreCandidates({
  shift: mondayDayShift,
  eligibility: EXAMPLE_DOCTORS.map((doctor) => ({
    doctorId: doctor.id,
    isEligible: true,
    reasons: []
  })),
  currentBias: primaryDominanceBias,
  currentWeekdayPairBias: primaryDominanceWeekdayPairBias,
  offRequests: EMPTY_OFF_REQUESTS,
  fairnessState: initializeFairnessWorkingState(EXAMPLE_DOCTORS),
  config: DEFAULT_SCHEDULING_ENGINE_CONFIG
});

export const deterministicAssignmentExample = generateRoster({
  rosterId: "deterministic-example",
  range: {
    startDate: "2026-04-06",
    endDate: "2026-04-06"
  },
  doctors: EXAMPLE_DOCTORS,
  shiftTypes: [EXAMPLE_SHIFT_TYPES[0]],
  leaves: [],
  offRequests: EMPTY_OFF_REQUESTS,
  currentBias: EXAMPLE_BIAS_LEDGER,
  currentWeekdayPairBias: EXAMPLE_WEEKDAY_PAIR_BIAS_LEDGER,
  weekendGroupSchedule: [],
  generatedByActorId: "system",
  config: DEFAULT_SCHEDULING_ENGINE_CONFIG
});

const mondayDayConflictShift = findWeekdayPairExampleShift("2026-04-06", "DAY");
const mondayNightConflictShift = findWeekdayPairExampleShift("2026-04-06", "NIGHT");

export const oneShiftPerDayValidationExample = validateGeneratedRoster({
  doctors: EXAMPLE_DOCTORS,
  leaves: [],
  shifts: [mondayDayConflictShift, mondayNightConflictShift],
  assignments: [
    {
      id: "assignment-monday-day",
      rosterId: "example-roster",
      shiftId: mondayDayConflictShift.id,
      assignedDoctorId: "doctor-a",
      actualDoctorId: "doctor-a",
      fairnessOwnerDoctorId: "doctor-a",
      source: "AUTO",
      createdAt: "2026-04-01T00:00:00.000Z",
      updatedAt: "2026-04-01T00:00:00.000Z"
    },
    {
      id: "assignment-monday-night",
      rosterId: "example-roster",
      shiftId: mondayNightConflictShift.id,
      assignedDoctorId: "doctor-a",
      actualDoctorId: "doctor-a",
      fairnessOwnerDoctorId: "doctor-a",
      source: "AUTO",
      createdAt: "2026-04-01T00:00:00.000Z",
      updatedAt: "2026-04-01T00:00:00.000Z"
    }
  ],
  weekendGroupSchedule: []
});

const thursdayNightValidationShift = findRestConstraintExampleShift("2026-04-09", "NIGHT");
const fridayDayValidationShift = findRestConstraintExampleShift("2026-04-10", "DAY");

export const restAfterNightValidationExample = validateGeneratedRoster({
  doctors: EXAMPLE_DOCTORS,
  leaves: [],
  shifts: [thursdayNightValidationShift, fridayDayValidationShift],
  assignments: [
    {
      id: "assignment-thursday-night-validation",
      rosterId: "rest-validation-roster",
      shiftId: thursdayNightValidationShift.id,
      assignedDoctorId: "doctor-b",
      actualDoctorId: "doctor-b",
      fairnessOwnerDoctorId: "doctor-b",
      source: "AUTO",
      createdAt: "2026-04-01T00:00:00.000Z",
      updatedAt: "2026-04-01T00:00:00.000Z"
    },
    {
      id: "assignment-friday-day-validation",
      rosterId: "rest-validation-roster",
      shiftId: fridayDayValidationShift.id,
      assignedDoctorId: "doctor-b",
      actualDoctorId: "doctor-b",
      fairnessOwnerDoctorId: "doctor-b",
      source: "AUTO",
      createdAt: "2026-04-01T00:00:00.000Z",
      updatedAt: "2026-04-01T00:00:00.000Z"
    }
  ],
  weekendGroupSchedule: EXAMPLE_WEEKEND_SCHEDULE
});

export const generatedBiasOutputsExample = {
  updatedBias: deterministicAssignmentExample.updatedBias,
  updatedWeekdayPairBias: deterministicAssignmentExample.updatedWeekdayPairBias
};
