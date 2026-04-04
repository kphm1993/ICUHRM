import type { ISODateString, RosterPeriod, YearMonthString } from "@/domain/models";
import { formatRosterMonth } from "@/features/roster/lib/formatters";
import { isDateWithinRosterWizardRange } from "@/features/roster/lib/rosterWizardStepOne";

interface RosterWizardHolidayCalendarProps {
  readonly month: YearMonthString;
  readonly range: RosterPeriod;
  readonly selectedHolidayDates: ReadonlyArray<ISODateString>;
  readonly isDisabled?: boolean;
  readonly onToggleHoliday: (date: ISODateString) => void;
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

export function RosterWizardHolidayCalendar(
  props: RosterWizardHolidayCalendarProps
) {
  const weeks = buildCalendarWeeks(props.month);
  const selectedHolidayDateSet = new Set(props.selectedHolidayDates);

  return (
    <section className="space-y-3 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
      <header className="space-y-1">
        <h4 className="text-base font-semibold text-slate-900">
          {formatRosterMonth(props.month)}
        </h4>
        <p className="text-sm text-slate-500">
          Click a date inside the selected roster range to mark or unmark a public
          holiday.
        </p>
      </header>

      <div className="grid grid-cols-7 gap-2 text-center text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((label, index) => (
          <div
            className={
              index >= 5
                ? "rounded-2xl bg-brand-50/70 px-2 py-2 text-brand-800"
                : "rounded-2xl bg-slate-50 px-2 py-2"
            }
            key={label}
          >
            {label}
          </div>
        ))}
      </div>

      <div className="space-y-2">
        {weeks.map((week, weekIndex) => (
          <div className="grid grid-cols-7 gap-2" key={`${props.month}-${weekIndex}`}>
            {week.map((day) => {
              const isWithinRange =
                day.isCurrentMonth &&
                isDateWithinRosterWizardRange(day.date, props.range);
              const isSelectedHoliday = selectedHolidayDateSet.has(day.date);

              return (
                <button
                  aria-label={`Toggle public holiday ${day.date}`}
                  aria-pressed={isSelectedHoliday}
                  className={[
                    "min-h-20 rounded-2xl border px-2 py-2 text-left transition",
                    day.isCurrentMonth
                      ? "border-slate-200 bg-white text-slate-900"
                      : "border-slate-100 bg-slate-50 text-slate-400",
                    day.isWeekend ? "bg-brand-50/60" : "",
                    isWithinRange
                      ? "hover:border-brand-300 hover:bg-brand-50/60"
                      : "cursor-not-allowed opacity-55",
                    isSelectedHoliday
                      ? "border-brand-500 bg-brand-700 text-white shadow-sm hover:bg-brand-700"
                      : ""
                  ].join(" ")}
                  disabled={props.isDisabled || !isWithinRange}
                  key={day.date}
                  onClick={() => props.onToggleHoliday(day.date)}
                  type="button"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-sm font-semibold">{day.dayNumber}</span>
                    {isSelectedHoliday ? (
                      <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-white">
                        Holiday
                      </span>
                    ) : null}
                  </div>
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </section>
  );
}
