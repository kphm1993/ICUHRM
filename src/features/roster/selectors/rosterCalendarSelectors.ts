import type {
  Doctor,
  EntityId,
  ISODateString,
  RosterSnapshot,
  Shift
} from "@/domain/models";
import { addDays, parseIsoDate, toIsoDate } from "@/domain/scheduling/dateUtils";

export interface RosterCalendarDoctorOption {
  readonly doctorId: EntityId;
  readonly label: string;
  readonly fullName: string;
}

export interface RosterCalendarShiftEntry {
  readonly shiftId: EntityId;
  readonly doctorId: EntityId | null;
  readonly displayName: string | null;
  readonly fullDoctorName: string | null;
  readonly timeRange: string;
  readonly shiftLabel: string;
  readonly isHighlighted: boolean;
  readonly isDimmed: boolean;
  readonly isFridayNight: boolean;
}

export interface RosterCalendarSlotViewModel {
  readonly kind: "DAY" | "NIGHT";
  readonly entries: ReadonlyArray<RosterCalendarShiftEntry>;
  readonly ariaLabel: string;
  readonly title: string;
  readonly isHighlighted: boolean;
  readonly isDimmed: boolean;
}

export interface RosterCalendarDayViewModel {
  readonly date: ISODateString;
  readonly dayOfMonth: number;
  readonly isCurrentMonth: boolean;
  readonly isWeekend: boolean;
  readonly daySlot: RosterCalendarSlotViewModel;
  readonly nightSlot: RosterCalendarSlotViewModel;
  readonly extraShiftCount: number;
}

export interface RosterCalendarWeekViewModel {
  readonly weekIndex: number;
  readonly days: ReadonlyArray<RosterCalendarDayViewModel>;
}

export interface RosterCalendarViewModel {
  readonly doctorOptions: ReadonlyArray<RosterCalendarDoctorOption>;
  readonly weeks: ReadonlyArray<RosterCalendarWeekViewModel>;
}

interface DisplayDoctorRecord {
  readonly doctorId: EntityId;
  readonly fullName: string;
  readonly uniqueIdentifier: string;
  readonly isSnapshotReferenced: boolean;
  readonly isActive: boolean;
}

interface NameParts {
  readonly strippedFullName: string;
  readonly firstName: string;
  readonly lastInitial: string | null;
}

interface BuildRosterCalendarViewModelInput {
  readonly snapshot: RosterSnapshot;
  readonly doctors: ReadonlyArray<Doctor>;
  readonly selectedDoctorId: EntityId | null;
}

function stripDoctorPrefix(name: string): string {
  return name.replace(/^\s*dr\.?\s+/i, "").trim();
}

function getAccessibleDoctorName(name: string): string {
  const trimmedName = name.trim();
  if (/^\s*dr\.?/i.test(trimmedName)) {
    return trimmedName;
  }

  return `Dr. ${trimmedName}`;
}

function getNameParts(name: string): NameParts {
  const strippedFullName = stripDoctorPrefix(name);
  const parts = strippedFullName.split(/\s+/).filter(Boolean);
  const firstName = parts[0] ?? strippedFullName;
  const lastPart = parts.length > 1 ? parts[parts.length - 1] : null;
  const lastInitial =
    lastPart && lastPart[0] ? `${lastPart[0].toUpperCase()}.` : null;

  return {
    strippedFullName,
    firstName,
    lastInitial
  };
}

function buildDisplayDoctorRecords(
  snapshot: RosterSnapshot,
  doctors: ReadonlyArray<Doctor>
): ReadonlyArray<DisplayDoctorRecord> {
  const records = new Map<EntityId, DisplayDoctorRecord>();

  for (const reference of snapshot.doctorReferences) {
    records.set(reference.doctorId, {
      doctorId: reference.doctorId,
      fullName: reference.name,
      uniqueIdentifier: reference.uniqueIdentifier,
      isSnapshotReferenced: true,
      isActive: reference.isActive
    });
  }

  for (const doctor of doctors) {
    const currentRecord = records.get(doctor.id);

    if (currentRecord) {
      records.set(doctor.id, {
        ...currentRecord,
        uniqueIdentifier: currentRecord.uniqueIdentifier || doctor.uniqueIdentifier,
        isActive: currentRecord.isActive || doctor.isActive
      });
      continue;
    }

    if (!doctor.isActive) {
      continue;
    }

    records.set(doctor.id, {
      doctorId: doctor.id,
      fullName: doctor.name,
      uniqueIdentifier: doctor.uniqueIdentifier,
      isSnapshotReferenced: false,
      isActive: doctor.isActive
    });
  }

  return Array.from(records.values()).filter(
    (record) => record.isSnapshotReferenced || record.isActive
  );
}

function buildShortDoctorLabels(
  records: ReadonlyArray<DisplayDoctorRecord>
): ReadonlyMap<EntityId, string> {
  const namePartsById = new Map<EntityId, NameParts>();

  for (const record of records) {
    namePartsById.set(record.doctorId, getNameParts(record.fullName));
  }

  const countsByFirstName = new Map<string, number>();
  const countsByFirstNameAndInitial = new Map<string, number>();
  const countsByFullName = new Map<string, number>();

  for (const record of records) {
    const parts = namePartsById.get(record.doctorId);
    if (!parts) {
      continue;
    }

    const firstNameKey = parts.firstName.toLocaleLowerCase();
    countsByFirstName.set(firstNameKey, (countsByFirstName.get(firstNameKey) ?? 0) + 1);

    const firstWithInitialKey = `${firstNameKey}|${parts.lastInitial ?? ""}`;
    countsByFirstNameAndInitial.set(
      firstWithInitialKey,
      (countsByFirstNameAndInitial.get(firstWithInitialKey) ?? 0) + 1
    );

    const fullNameKey = parts.strippedFullName.toLocaleLowerCase();
    countsByFullName.set(fullNameKey, (countsByFullName.get(fullNameKey) ?? 0) + 1);
  }

  const labels = new Map<EntityId, string>();

  for (const record of records) {
    const parts = namePartsById.get(record.doctorId);
    if (!parts) {
      labels.set(record.doctorId, stripDoctorPrefix(record.fullName));
      continue;
    }

    const firstNameKey = parts.firstName.toLocaleLowerCase();
    if ((countsByFirstName.get(firstNameKey) ?? 0) === 1) {
      labels.set(record.doctorId, parts.firstName);
      continue;
    }

    if (parts.lastInitial) {
      const firstWithInitialKey = `${firstNameKey}|${parts.lastInitial}`;
      if ((countsByFirstNameAndInitial.get(firstWithInitialKey) ?? 0) === 1) {
        labels.set(record.doctorId, `${parts.firstName} ${parts.lastInitial}`);
        continue;
      }
    }

    const strippedFullName = parts.strippedFullName || record.fullName.trim();
    const fullNameKey = strippedFullName.toLocaleLowerCase();

    if ((countsByFullName.get(fullNameKey) ?? 0) === 1) {
      labels.set(record.doctorId, strippedFullName);
      continue;
    }

    labels.set(record.doctorId, `${strippedFullName} (${record.uniqueIdentifier})`);
  }

  return labels;
}

function getMonthRange(rosterMonth: string) {
  const [yearValue, monthValue] = rosterMonth.split("-");
  const year = Number(yearValue);
  const monthIndex = Number(monthValue) - 1;
  const firstDate = new Date(Date.UTC(year, monthIndex, 1));
  const lastDate = new Date(Date.UTC(year, monthIndex + 1, 0));

  return {
    firstDate,
    lastDate
  };
}

function getMondayStart(date: Date): Date {
  const dayOfWeek = date.getUTCDay();
  const offset = (dayOfWeek + 6) % 7;
  return addDays(date, -offset);
}

function getSundayEnd(date: Date): Date {
  const dayOfWeek = date.getUTCDay();
  const offset = (7 - ((dayOfWeek + 6) % 7) - 1) % 7;
  return addDays(date, offset);
}

function isWeekendDate(date: ISODateString): boolean {
  const dayOfWeek = parseIsoDate(date).getUTCDay();
  return dayOfWeek === 0 || dayOfWeek === 6;
}

function formatAccessibleDate(date: ISODateString): string {
  return new Date(`${date}T00:00:00.000Z`).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    timeZone: "UTC"
  });
}

function sortShiftEntries(left: Shift, right: Shift): number {
  const dateComparison = left.date.localeCompare(right.date);
  if (dateComparison !== 0) {
    return dateComparison;
  }

  const startTimeComparison = left.startTime.localeCompare(right.startTime);
  if (startTimeComparison !== 0) {
    return startTimeComparison;
  }

  return left.definitionSnapshot.code.localeCompare(right.definitionSnapshot.code);
}

function buildSlotAriaLabel(
  date: ISODateString,
  kind: "DAY" | "NIGHT",
  entries: ReadonlyArray<RosterCalendarShiftEntry>
): string {
  const dateLabel = formatAccessibleDate(date);
  const slotLabel = kind === "DAY" ? "day shift" : "night shift";

  if (entries.length === 0) {
    return `${dateLabel} ${slotLabel} not scheduled.`;
  }

  if (entries.length === 1) {
    const entry = entries[0];
    if (!entry) {
      return `${dateLabel} ${slotLabel} not scheduled.`;
    }

    return entry.fullDoctorName
      ? `${dateLabel} ${slotLabel} assigned to ${entry.fullDoctorName}.`
      : `${dateLabel} ${slotLabel} unassigned.`;
  }

  const entrySummary = entries
    .map((entry) =>
      entry.fullDoctorName ? entry.fullDoctorName : "unassigned doctor"
    )
    .join(", ");

  return `${dateLabel} ${slotLabel} with ${entries.length} assignments: ${entrySummary}.`;
}

function buildSlotTitle(
  date: ISODateString,
  kind: "DAY" | "NIGHT",
  entries: ReadonlyArray<RosterCalendarShiftEntry>
): string {
  const kindLabel = kind === "DAY" ? "DAY" : "NIGHT";

  if (entries.length === 0) {
    return `${date} ${kindLabel}: unassigned`;
  }

  if (entries.length === 1) {
    const entry = entries[0];
    if (!entry?.displayName) {
      return `${date} ${kindLabel}: unassigned`;
    }

    return `${date} ${kindLabel}: Dr. ${entry.displayName}`;
  }

  const names = entries
    .map((entry) => (entry.displayName ? `Dr. ${entry.displayName}` : "unassigned"))
    .join(", ");

  return `${date} ${kindLabel}: ${names}`;
}

function buildSlotViewModel(input: {
  readonly date: ISODateString;
  readonly kind: "DAY" | "NIGHT";
  readonly entries: ReadonlyArray<RosterCalendarShiftEntry>;
  readonly selectedDoctorId: EntityId | null;
}): RosterCalendarSlotViewModel {
  const hasHighlight = input.entries.some((entry) => entry.isHighlighted);
  const hasAssignedDoctor = input.entries.some((entry) => Boolean(entry.doctorId));

  return {
    kind: input.kind,
    entries: input.entries,
    ariaLabel: buildSlotAriaLabel(input.date, input.kind, input.entries),
    title: buildSlotTitle(input.date, input.kind, input.entries),
    isHighlighted: hasHighlight,
    isDimmed:
      Boolean(input.selectedDoctorId) && hasAssignedDoctor && !hasHighlight
  };
}

function buildShiftEntriesByDate(
  input: BuildRosterCalendarViewModelInput,
  shortLabelsByDoctorId: ReadonlyMap<EntityId, string>,
  fullNamesByDoctorId: ReadonlyMap<EntityId, string>
): ReadonlyMap<
  ISODateString,
  {
    readonly dayEntries: ReadonlyArray<RosterCalendarShiftEntry>;
    readonly nightEntries: ReadonlyArray<RosterCalendarShiftEntry>;
    readonly extraShiftCount: number;
  }
> {
  const assignmentByShiftId = new Map(
    input.snapshot.assignments.map((assignment) => [assignment.shiftId, assignment] as const)
  );
  const shiftsByDate = new Map<
    ISODateString,
    {
      dayEntries: RosterCalendarShiftEntry[];
      nightEntries: RosterCalendarShiftEntry[];
      extraShiftCount: number;
    }
  >();

  for (const shift of input.snapshot.shifts.slice().sort(sortShiftEntries)) {
    const assignment = assignmentByShiftId.get(shift.id);
    const doctorId = assignment?.assignedDoctorId ?? null;
    const displayName = doctorId ? shortLabelsByDoctorId.get(doctorId) ?? null : null;
    const fullDoctorName = doctorId ? fullNamesByDoctorId.get(doctorId) ?? null : null;
    const isHighlighted = Boolean(input.selectedDoctorId) && doctorId === input.selectedDoctorId;
    const isDimmed =
      Boolean(input.selectedDoctorId) && Boolean(doctorId) && doctorId !== input.selectedDoctorId;

    const entry: RosterCalendarShiftEntry = {
      shiftId: shift.id,
      doctorId,
      displayName,
      fullDoctorName,
      timeRange: `${shift.startTime} - ${shift.endTime}`,
      shiftLabel: shift.definitionSnapshot.label,
      isHighlighted,
      isDimmed,
      isFridayNight: shift.special === "FRIDAY_NIGHT"
    };

    const currentDateEntries = shiftsByDate.get(shift.date) ?? {
      dayEntries: [],
      nightEntries: [],
      extraShiftCount: 0
    };

    if (shift.type === "DAY") {
      currentDateEntries.dayEntries.push(entry);
    } else if (shift.type === "NIGHT") {
      currentDateEntries.nightEntries.push(entry);
    } else {
      currentDateEntries.extraShiftCount += 1;
    }

    shiftsByDate.set(shift.date, currentDateEntries);
  }

  return shiftsByDate;
}

export function buildRosterCalendarViewModel(
  input: BuildRosterCalendarViewModelInput
): RosterCalendarViewModel {
  const doctorRecords = buildDisplayDoctorRecords(input.snapshot, input.doctors);
  const shortLabelsByDoctorId = buildShortDoctorLabels(doctorRecords);
  const fullNamesByDoctorId = new Map<EntityId, string>(
    doctorRecords.map((record) => [
      record.doctorId,
      getAccessibleDoctorName(record.fullName)
    ] as const)
  );
  const doctorOptions = doctorRecords
    .map((record) => ({
      doctorId: record.doctorId,
      label: shortLabelsByDoctorId.get(record.doctorId) ?? stripDoctorPrefix(record.fullName),
      fullName: record.fullName
    }))
    .sort((left, right) => {
      const labelComparison = left.label.localeCompare(right.label);
      return labelComparison !== 0
        ? labelComparison
        : left.fullName.localeCompare(right.fullName);
    });

  const shiftsByDate = buildShiftEntriesByDate(
    input,
    shortLabelsByDoctorId,
    fullNamesByDoctorId
  );
  const { firstDate, lastDate } = getMonthRange(
    input.snapshot.generatedInputSummary.rosterMonth
  );
  const calendarStart = getMondayStart(firstDate);
  const calendarEnd = getSundayEnd(lastDate);
  const weeks: RosterCalendarWeekViewModel[] = [];

  let weekIndex = 0;
  let cursor = calendarStart;

  while (cursor <= calendarEnd) {
    const days: RosterCalendarDayViewModel[] = [];

    for (let dayIndex = 0; dayIndex < 7; dayIndex += 1) {
      const date = toIsoDate(cursor);
      const dateEntries = shiftsByDate.get(date);
      const dayEntries = dateEntries?.dayEntries ?? [];
      const nightEntries = dateEntries?.nightEntries ?? [];

      days.push({
        date,
        dayOfMonth: cursor.getUTCDate(),
        isCurrentMonth: date.startsWith(input.snapshot.generatedInputSummary.rosterMonth),
        isWeekend: isWeekendDate(date),
        daySlot: buildSlotViewModel({
          date,
          kind: "DAY",
          entries: dayEntries,
          selectedDoctorId: input.selectedDoctorId
        }),
        nightSlot: buildSlotViewModel({
          date,
          kind: "NIGHT",
          entries: nightEntries,
          selectedDoctorId: input.selectedDoctorId
        }),
        extraShiftCount: dateEntries?.extraShiftCount ?? 0
      });

      cursor = addDays(cursor, 1);
    }

    weeks.push({
      weekIndex,
      days
    });
    weekIndex += 1;
  }

  return {
    doctorOptions,
    weeks
  };
}
