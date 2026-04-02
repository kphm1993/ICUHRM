import type {
  BiasBalance,
  BiasLedger,
  Doctor,
  RosterSnapshot,
  WeekdayPairBiasBalance,
  WeekdayPairBiasLedger
} from "@/domain/models";

export interface RosterDoctorSummaryRow {
  readonly doctorId: string;
  readonly doctorName: string;
  readonly totalAssigned: number;
  readonly weekdayDay: number;
  readonly weekdayNight: number;
  readonly weekendDay: number;
  readonly weekendNight: number;
  readonly currentBias: BiasBalance;
  readonly projectedBias: BiasBalance | null;
  readonly currentWeekdayPairBias: WeekdayPairBiasBalance | null;
  readonly projectedWeekdayPairBias: WeekdayPairBiasBalance | null;
}

function createEmptyBiasBalance(): BiasBalance {
  return {
    weekdayDay: 0,
    weekdayNight: 0,
    weekendDay: 0,
    weekendNight: 0
  };
}

function createEmptyWeekdayPairBiasBalance(): WeekdayPairBiasBalance {
  return {
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
  };
}

function findBiasLedger(
  entries: ReadonlyArray<BiasLedger>,
  doctorId: string
): BiasLedger | null {
  return entries.find((entry) => entry.doctorId === doctorId) ?? null;
}

function findWeekdayPairBiasLedger(
  entries: ReadonlyArray<WeekdayPairBiasLedger>,
  doctorId: string
): WeekdayPairBiasLedger | null {
  return entries.find((entry) => entry.doctorId === doctorId) ?? null;
}

export function buildRosterDoctorSummaryRows(input: {
  readonly doctors: ReadonlyArray<Doctor>;
  readonly snapshot: RosterSnapshot | null;
  readonly currentBias: ReadonlyArray<BiasLedger>;
  readonly currentWeekdayPairBias: ReadonlyArray<WeekdayPairBiasLedger>;
}): ReadonlyArray<RosterDoctorSummaryRow> {
  const shiftsById = new Map(
    (input.snapshot?.shifts ?? []).map((shift) => [shift.id, shift] as const)
  );

  return [...input.doctors]
    .sort((left, right) => left.name.localeCompare(right.name))
    .map((doctor) => {
      const matchingAssignments = (input.snapshot?.assignments ?? []).filter(
        (assignment) => assignment.assignedDoctorId === doctor.id
      );

      let weekdayDay = 0;
      let weekdayNight = 0;
      let weekendDay = 0;
      let weekendNight = 0;

      for (const assignment of matchingAssignments) {
        const shift = shiftsById.get(assignment.shiftId);

        if (!shift) {
          continue;
        }

        if (shift.category === "WEEKEND" && shift.type === "DAY") {
          weekendDay += 1;
          continue;
        }

        if (shift.category === "WEEKEND" && shift.type === "NIGHT") {
          weekendNight += 1;
          continue;
        }

        if (shift.type === "DAY") {
          weekdayDay += 1;
          continue;
        }

        if (shift.type === "NIGHT") {
          weekdayNight += 1;
        }
      }

      const currentBiasLedger = findBiasLedger(input.currentBias, doctor.id);
      const projectedBiasLedger = findBiasLedger(
        input.snapshot?.updatedBias ?? [],
        doctor.id
      );
      const currentWeekdayPairBiasLedger = findWeekdayPairBiasLedger(
        input.currentWeekdayPairBias,
        doctor.id
      );
      const projectedWeekdayPairBiasLedger = findWeekdayPairBiasLedger(
        input.snapshot?.updatedWeekdayPairBias ?? [],
        doctor.id
      );

      return {
        doctorId: doctor.id,
        doctorName: doctor.name,
        totalAssigned: matchingAssignments.length,
        weekdayDay,
        weekdayNight,
        weekendDay,
        weekendNight,
        currentBias: currentBiasLedger?.balance ?? createEmptyBiasBalance(),
        projectedBias: projectedBiasLedger?.balance ?? null,
        currentWeekdayPairBias:
          currentWeekdayPairBiasLedger?.balance ?? createEmptyWeekdayPairBiasBalance(),
        projectedWeekdayPairBias: projectedWeekdayPairBiasLedger?.balance ?? null
      };
    });
}

export function buildFairnessComparisonRows(input: {
  readonly doctors: ReadonlyArray<Doctor>;
  readonly snapshot: RosterSnapshot | null;
  readonly currentBias: ReadonlyArray<BiasLedger>;
  readonly currentWeekdayPairBias: ReadonlyArray<WeekdayPairBiasLedger>;
}): ReadonlyArray<RosterDoctorSummaryRow> {
  return buildRosterDoctorSummaryRows(input);
}
