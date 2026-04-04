import type { ISODateString } from "@/domain/models";
import type { DutyDesignAssignmentCalendarWeekViewModel } from "@/features/admin/selectors/dutyDesignAssignmentCalendarSelectors";

interface DutyDesignAssignmentCalendarProps {
  readonly weeks: ReadonlyArray<DutyDesignAssignmentCalendarWeekViewModel>;
  readonly isLoading: boolean;
  readonly onToggleDate: (date: ISODateString) => void;
  readonly onUnassignDutyDesign: (assignmentId: string) => void;
}

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

export function DutyDesignAssignmentCalendar(
  props: DutyDesignAssignmentCalendarProps
) {
  return (
    <section className="space-y-4 rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-panel">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-brand-700">
          Duty Design Assignments
        </p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
          Monthly Assignment Calendar
        </h2>
      </div>

      {props.isLoading ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-600">
          Loading assignment calendar...
        </div>
      ) : null}

      {!props.isLoading ? (
        <>
          <div className="grid grid-cols-7 gap-2 text-center text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            {WEEKDAY_LABELS.map((label, index) => (
              <div
                className={
                  index >= 5
                    ? "rounded-2xl bg-brand-50/70 px-2 py-2 text-brand-800"
                    : "rounded-2xl bg-slate-100 px-2 py-2"
                }
                key={label}
              >
                {label}
              </div>
            ))}
          </div>

          <div className="space-y-2">
            {props.weeks.map((week) => (
              <div className="grid grid-cols-7 gap-2" key={week.weekIndex}>
                {week.days.map((day) => (
                  <div
                    className={[
                      "min-h-36 rounded-2xl border p-2 transition",
                      day.isCurrentMonth
                        ? "border-slate-200 bg-white"
                        : "border-slate-100 bg-slate-50/70 text-slate-400",
                      day.isWeekend ? "bg-brand-50/60" : "",
                      day.isSelected ? "border-brand-400 ring-1 ring-brand-300" : ""
                    ].join(" ")}
                    key={day.date}
                  >
                    <button
                      aria-label={`Toggle assignment date ${day.date}`}
                      aria-pressed={day.isSelected}
                      className="flex w-full items-center justify-between rounded-xl px-2 py-1 text-left transition hover:bg-white/80"
                      disabled={!day.isCurrentMonth}
                      onClick={() => props.onToggleDate(day.date)}
                      type="button"
                    >
                      <span className="text-sm font-semibold text-slate-900">
                        {day.dayNumber}
                      </span>
                      {day.isSelected ? (
                        <span className="rounded-full bg-brand-700 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-white">
                          Selected
                        </span>
                      ) : null}
                    </button>

                    <div className="mt-2 space-y-2">
                      {day.assignments.length === 0 ? (
                        <p className="px-2 text-xs text-slate-400">No assignments</p>
                      ) : null}

                      {day.assignments.map((assignment) => (
                        <div
                          className="rounded-xl border border-slate-200 bg-white/90 px-2 py-2 text-xs text-slate-700 shadow-sm"
                          key={assignment.id}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="truncate font-semibold text-slate-900">
                                {assignment.label}
                              </p>
                              <p className="mt-1 truncate text-slate-500">
                                {assignment.code}
                              </p>
                            </div>

                            <button
                              aria-label={`Remove ${assignment.label} from ${day.date}`}
                              className="rounded-full border border-rose-300 bg-rose-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-rose-700 transition hover:border-rose-400 hover:bg-rose-100"
                              onClick={() => {
                                if (
                                  window.confirm(
                                    `Remove ${assignment.label} from ${day.date}?`
                                  )
                                ) {
                                  props.onUnassignDutyDesign(assignment.id);
                                }
                              }}
                              type="button"
                            >
                              Remove
                            </button>
                          </div>

                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {!assignment.isActive ? (
                              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-600">
                                Inactive Design
                              </span>
                            ) : null}
                            {assignment.isHolidayOverride ? (
                              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-amber-900">
                                Holiday
                              </span>
                            ) : null}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </>
      ) : null}
    </section>
  );
}
