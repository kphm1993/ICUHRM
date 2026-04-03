import type {
  BiasCriteria,
  BiasBalance,
  BiasLedger,
  Doctor,
  RosterSnapshot,
  WeekdayPairBiasBalance,
  WeekdayPairBiasLedger
} from "@/domain/models";
import { readLegacyBiasBalance } from "@/domain/scheduling/biasBuckets";
import type { BiasDisplayEntry } from "@/features/roster/lib/formatters";

export interface RosterDoctorSummaryRow {
  readonly doctorId: string;
  readonly doctorName: string;
  readonly totalAssigned: number;
  readonly weekdayDay: number;
  readonly weekdayNight: number;
  readonly weekendDay: number;
  readonly weekendNight: number;
  readonly primaryBiasMode: "legacy" | "criteria";
  readonly currentBias: BiasBalance | null;
  readonly projectedBias: BiasBalance | null;
  readonly currentPrimaryBiasEntries: ReadonlyArray<BiasDisplayEntry>;
  readonly projectedPrimaryBiasEntries: ReadonlyArray<BiasDisplayEntry> | null;
  readonly currentWeekdayPairBias: WeekdayPairBiasBalance | null;
  readonly projectedWeekdayPairBias: WeekdayPairBiasBalance | null;
  readonly showWeekdayPairBias: boolean;
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

function buildDisplayDoctorRecords(input: {
  readonly doctors: ReadonlyArray<Doctor>;
  readonly snapshot: RosterSnapshot | null;
}): ReadonlyArray<{
  readonly doctorId: string;
  readonly name: string;
}> {
  const records = new Map<string, { readonly doctorId: string; readonly name: string }>();

  for (const reference of input.snapshot?.doctorReferences ?? []) {
    records.set(reference.doctorId, {
      doctorId: reference.doctorId,
      name: reference.name
    });
  }

  for (const doctor of input.doctors) {
    if (!records.has(doctor.id)) {
      records.set(doctor.id, {
        doctorId: doctor.id,
        name: doctor.name
      });
    }
  }

  return Array.from(records.values()).sort((left, right) =>
    left.name.localeCompare(right.name)
  );
}

function buildCriteriaBiasEntries(
  criteria: ReadonlyArray<BiasCriteria>,
  balances: Readonly<Record<string, number>> | null | undefined
): ReadonlyArray<BiasDisplayEntry> {
  return criteria.map((entry) => ({
    id: entry.id,
    label: entry.label,
    value: balances?.[entry.id] ?? 0
  }));
}

function resolvePrimaryBiasMode(input: {
  readonly snapshot: RosterSnapshot | null;
  readonly activeBiasCriteria: ReadonlyArray<BiasCriteria>;
}): {
  readonly mode: "legacy" | "criteria";
  readonly criteria: ReadonlyArray<BiasCriteria>;
} {
  const snapshotCriteria = input.snapshot?.generatedInputSummary.activeBiasCriteria ?? [];

  if (snapshotCriteria.length > 0) {
    return {
      mode: "criteria",
      criteria: snapshotCriteria
    };
  }

  if (input.activeBiasCriteria.length > 0) {
    return {
      mode: "criteria",
      criteria: input.activeBiasCriteria
    };
  }

  return {
    mode: "legacy",
    criteria: []
  };
}

export function buildRosterDoctorSummaryRows(input: {
  readonly doctors: ReadonlyArray<Doctor>;
  readonly snapshot: RosterSnapshot | null;
  readonly currentBias: ReadonlyArray<BiasLedger>;
  readonly currentWeekdayPairBias: ReadonlyArray<WeekdayPairBiasLedger>;
  readonly activeBiasCriteria: ReadonlyArray<BiasCriteria>;
}): ReadonlyArray<RosterDoctorSummaryRow> {
  const shiftsById = new Map(
    (input.snapshot?.shifts ?? []).map((shift) => [shift.id, shift] as const)
  );
  const displayDoctors = buildDisplayDoctorRecords({
    doctors: input.doctors,
    snapshot: input.snapshot
  });
  const primaryBiasDisplay = resolvePrimaryBiasMode({
    snapshot: input.snapshot,
    activeBiasCriteria: input.activeBiasCriteria
  });
  const showWeekdayPairBias = primaryBiasDisplay.mode === "legacy";

  return displayDoctors.map((doctor) => {
    const matchingAssignments = (input.snapshot?.assignments ?? []).filter(
      (assignment) => assignment.assignedDoctorId === doctor.doctorId
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

    const currentBiasLedger = findBiasLedger(input.currentBias, doctor.doctorId);
    const projectedBiasLedger = findBiasLedger(
      input.snapshot?.updatedBias ?? [],
      doctor.doctorId
    );
    const currentWeekdayPairBiasLedger = findWeekdayPairBiasLedger(
      input.currentWeekdayPairBias,
      doctor.doctorId
    );
    const projectedWeekdayPairBiasLedger = findWeekdayPairBiasLedger(
      input.snapshot?.updatedWeekdayPairBias ?? [],
      doctor.doctorId
    );

    return {
      doctorId: doctor.doctorId,
      doctorName: doctor.name,
      totalAssigned: matchingAssignments.length,
      weekdayDay,
      weekdayNight,
      weekendDay,
      weekendNight,
      primaryBiasMode: primaryBiasDisplay.mode,
      currentBias:
        primaryBiasDisplay.mode === "legacy"
          ? readLegacyBiasBalance(currentBiasLedger?.balances)
          : null,
      projectedBias:
        primaryBiasDisplay.mode === "legacy" && projectedBiasLedger
          ? readLegacyBiasBalance(projectedBiasLedger.balances)
          : null,
      currentPrimaryBiasEntries:
        primaryBiasDisplay.mode === "criteria"
          ? buildCriteriaBiasEntries(
              primaryBiasDisplay.criteria,
              currentBiasLedger?.balances
            )
          : [],
      projectedPrimaryBiasEntries:
        primaryBiasDisplay.mode === "criteria"
          ? buildCriteriaBiasEntries(
              primaryBiasDisplay.criteria,
              projectedBiasLedger?.balances
            )
          : null,
      currentWeekdayPairBias:
        showWeekdayPairBias
          ? (currentWeekdayPairBiasLedger?.balance ?? createEmptyWeekdayPairBiasBalance())
          : null,
      projectedWeekdayPairBias:
        showWeekdayPairBias ? (projectedWeekdayPairBiasLedger?.balance ?? null) : null,
      showWeekdayPairBias
    };
  });
}

export function buildFairnessComparisonRows(input: {
  readonly doctors: ReadonlyArray<Doctor>;
  readonly snapshot: RosterSnapshot | null;
  readonly currentBias: ReadonlyArray<BiasLedger>;
  readonly currentWeekdayPairBias: ReadonlyArray<WeekdayPairBiasLedger>;
  readonly activeBiasCriteria: ReadonlyArray<BiasCriteria>;
}): ReadonlyArray<RosterDoctorSummaryRow> {
  return buildRosterDoctorSummaryRows(input);
}
