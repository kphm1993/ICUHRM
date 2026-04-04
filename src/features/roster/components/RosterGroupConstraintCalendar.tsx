import type { DoctorGroup, ISODateString, YearMonthString } from "@/domain/models";
import { formatRosterDate } from "@/features/roster/lib/formatters";

interface RosterGroupConstraintCalendarProps {
  readonly month: YearMonthString;
  readonly doctorGroups: ReadonlyArray<DoctorGroup>;
  readonly allowedDoctorGroupIdByDate: Readonly<Record<ISODateString, string>>;
  readonly selectedDates: ReadonlyArray<ISODateString>;
  readonly selectedGroupId: string;
  readonly onToggleDate: (date: ISODateString) => void;
  readonly onClearSelectedDates: () => void;
  readonly onSelectedGroupIdChange: (groupId: string) => void;
  readonly onApplySelectedDates: () => void;
  readonly onClearDateConstraint: (date: ISODateString) => void;
}

interface CalendarDay {
  readonly date: ISODateString;
  readonly dayNumber: number;
  readonly isCurrentMonth: boolean;
  readonly isWeekend: boolean;
}

function getMonthDate(yearMonth: YearMonthString): Date {
  return new Date(`${yearMonth}-01T00:00:00.000Z`);
}

function toIsoDateString(date: Date): ISODateString {
  return date.toISOString().slice(0, 10) as ISODateString;
}

function addDays(date: Date, days: number): Date {
  const nextDate = new Date(date);
  nextDate.setUTCDate(nextDate.getUTCDate() + days);
  return nextDate;
}

function getMondayStart(date: Date): Date {
  const day = date.getUTCDay();
  const normalizedDay = day === 0 ? 7 : day;
  return addDays(date, 1 - normalizedDay);
}

function getSundayEnd(date: Date): Date {
  const day = date.getUTCDay();
  const normalizedDay = day === 0 ? 7 : day;
  return addDays(date, 7 - normalizedDay);
}

function buildCalendarWeeks(month: YearMonthString): ReadonlyArray<ReadonlyArray<CalendarDay>> {
  const monthStart = getMonthDate(month);
  const monthEnd = new Date(monthStart);
  monthEnd.setUTCMonth(monthEnd.getUTCMonth() + 1, 0);
  const gridStart = getMondayStart(monthStart);
  const gridEnd = getSundayEnd(monthEnd);
  const weeks: CalendarDay[][] = [];
  let cursor = gridStart;

  while (cursor <= gridEnd) {
    const week: CalendarDay[] = [];

    for (let offset = 0; offset < 7; offset += 1) {
      const date = addDays(cursor, offset);
      const isoDate = toIsoDateString(date);
      const dayOfWeek = date.getUTCDay();

      week.push({
        date: isoDate,
        dayNumber: date.getUTCDate(),
        isCurrentMonth: date.getUTCMonth() === monthStart.getUTCMonth(),
        isWeekend: dayOfWeek === 0 || dayOfWeek === 6
      });
    }

    weeks.push(week);
    cursor = addDays(cursor, 7);
  }

  return weeks;
}

export function RosterGroupConstraintCalendar(
  props: RosterGroupConstraintCalendarProps
) {
  const weeks = buildCalendarWeeks(props.month);
  const selectedDateSet = new Set(props.selectedDates);
  const groupNameById = new Map(
    props.doctorGroups.map((group) => [group.id, group.name] as const)
  );

  return (
    <section className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-700">
            Group Constraints By Date
          </h3>
          <p className="mt-2 text-sm text-slate-600">
            Select dates, choose a group, and apply an allowed-group constraint for
            those roster dates.
          </p>
        </div>

        <div className="w-full max-w-md space-y-3">
          <label className="block space-y-2">
            <span className="text-sm font-medium text-slate-700">Allowed group</span>
            <select
              className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-brand-500"
              onChange={(event) => props.onSelectedGroupIdChange(event.target.value)}
              value={props.selectedGroupId}
            >
              <option value="">Select group</option>
              {props.doctorGroups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
            </select>
          </label>

          <div className="flex flex-wrap gap-2">
            <button
              className="rounded-full bg-brand-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-800"
              onClick={props.onApplySelectedDates}
              type="button"
            >
              Apply To Selected Dates
            </button>
            <button
              className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-brand-300 hover:text-brand-800"
              disabled={props.selectedDates.length === 0}
              onClick={props.onClearSelectedDates}
              type="button"
            >
              Clear Selection
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {props.selectedDates.length === 0 ? (
          <span className="text-sm text-slate-500">No dates selected.</span>
        ) : (
          props.selectedDates.map((date) => (
            <span
              className="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-900"
              key={date}
            >
              {formatRosterDate(date)}
            </span>
          ))
        )}
      </div>

      <div className="grid grid-cols-7 gap-2 text-center text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((label, index) => (
          <div
            className={
              index >= 5
                ? "rounded-2xl bg-brand-50/70 px-2 py-2 text-brand-800"
                : "rounded-2xl bg-white px-2 py-2"
            }
            key={label}
          >
            {label}
          </div>
        ))}
      </div>

      <div className="space-y-2">
        {weeks.map((week, weekIndex) => (
          <div className="grid grid-cols-7 gap-2" key={weekIndex}>
            {week.map((day) => {
              const allowedGroupId = props.allowedDoctorGroupIdByDate[day.date];
              const allowedGroupName = allowedGroupId
                ? groupNameById.get(allowedGroupId) ?? "Unknown group"
                : null;

              return (
                <div
                  className={[
                    "min-h-32 rounded-2xl border p-2 transition",
                    day.isCurrentMonth
                      ? "border-slate-200 bg-white"
                      : "border-slate-100 bg-slate-50/70 text-slate-400",
                    day.isWeekend ? "bg-brand-50/60" : "",
                    selectedDateSet.has(day.date)
                      ? "border-brand-400 ring-1 ring-brand-300"
                      : ""
                  ].join(" ")}
                  key={day.date}
                >
                  <button
                    aria-label={`Toggle group constraint date ${day.date}`}
                    aria-pressed={selectedDateSet.has(day.date)}
                    className="flex w-full items-center justify-between rounded-xl px-2 py-1 text-left transition hover:bg-white/80"
                    disabled={!day.isCurrentMonth}
                    onClick={() => props.onToggleDate(day.date)}
                    type="button"
                  >
                    <span className="text-sm font-semibold text-slate-900">
                      {day.dayNumber}
                    </span>
                    {selectedDateSet.has(day.date) ? (
                      <span className="rounded-full bg-brand-700 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-white">
                        Selected
                      </span>
                    ) : null}
                  </button>

                  <div className="mt-2 space-y-2">
                    {allowedGroupName ? (
                      <div className="rounded-xl border border-slate-200 bg-white/90 px-2 py-2 text-xs text-slate-700 shadow-sm">
                        <p className="font-semibold text-slate-900">{allowedGroupName}</p>
                        <div className="mt-2 flex justify-end">
                          <button
                            aria-label={`Clear group constraint on ${day.date}`}
                            className="rounded-full border border-rose-300 bg-rose-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-rose-700 transition hover:border-rose-400 hover:bg-rose-100"
                            onClick={() => props.onClearDateConstraint(day.date)}
                            type="button"
                          >
                            Clear
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="px-2 text-xs text-slate-400">Open to all groups</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </section>
  );
}
