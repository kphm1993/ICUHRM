import type {
  RosterCalendarShiftEntry,
  RosterCalendarSlotViewModel,
  RosterCalendarWeekViewModel
} from "@/features/roster/selectors/rosterCalendarSelectors";

const WEEKDAY_HEADERS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

interface RosterCalendarViewProps {
  readonly weeks: ReadonlyArray<RosterCalendarWeekViewModel>;
}

function resolveDayCellClasses(input: {
  readonly isCurrentMonth: boolean;
  readonly isWeekend: boolean;
}): string {
  if (!input.isCurrentMonth && input.isWeekend) {
    return "border-amber-100 bg-amber-50/40";
  }

  if (!input.isCurrentMonth) {
    return "border-slate-200 bg-slate-50/70";
  }

  if (input.isWeekend) {
    return "border-amber-200 bg-amber-50/80";
  }

  return "border-slate-200 bg-white";
}

function resolveSlotClasses(slot: RosterCalendarSlotViewModel): string {
  if (slot.isHighlighted) {
    return "border-brand-500 bg-brand-100 shadow-sm ring-1 ring-brand-200";
  }

  if (slot.isDimmed) {
    return "border-slate-200 bg-white/80 opacity-70";
  }

  return "border-slate-200 bg-white/90";
}

function resolveEntryClasses(entry: RosterCalendarShiftEntry): string {
  if (entry.isHighlighted) {
    return "border-brand-300 bg-white text-brand-950";
  }

  if (entry.isDimmed) {
    return "border-slate-200 bg-slate-50 text-slate-500";
  }

  return "border-slate-200 bg-slate-50/80 text-slate-700";
}

function SlotEntry({ entry }: { readonly entry: RosterCalendarShiftEntry }) {
  return (
    <div className={["rounded-lg border px-2 py-1.5", resolveEntryClasses(entry)].join(" ")}>
      <p className="truncate text-xs font-semibold">{entry.displayName ?? "-"}</p>
      <p className="mt-1 truncate text-[11px] text-slate-500">{entry.timeRange}</p>
    </div>
  );
}

function SlotPlaceholder() {
  return (
    <div className="rounded-lg border border-dashed border-slate-200 bg-white/70 px-2 py-2 text-center text-xs font-semibold text-slate-400">
      -
    </div>
  );
}

function RosterShiftSlot({ slot }: { readonly slot: RosterCalendarSlotViewModel }) {
  const hasFridayNightEntry = slot.entries.some((entry) => entry.isFridayNight);

  return (
    <div
      aria-label={slot.ariaLabel}
      className={[
        "min-h-[7.5rem] rounded-xl border p-2 outline-none transition focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-1",
        resolveSlotClasses(slot)
      ].join(" ")}
      role="group"
      tabIndex={0}
      title={slot.title}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-600">
          {slot.kind}
        </span>
        {hasFridayNightEntry ? (
          <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-orange-800">
            Fri N
          </span>
        ) : null}
      </div>

      <div className="mt-2 space-y-1.5">
        {slot.entries.length > 0 ? (
          slot.entries.map((entry) => <SlotEntry entry={entry} key={entry.shiftId} />)
        ) : (
          <SlotPlaceholder />
        )}
      </div>
    </div>
  );
}

export function RosterCalendarView(props: RosterCalendarViewProps) {
  return (
    <div className="overflow-x-auto">
      <div className="min-w-[64rem]">
        <div className="grid grid-cols-7 gap-3">
          {WEEKDAY_HEADERS.map((header) => (
            <div
              className="rounded-xl bg-slate-100 px-3 py-2 text-center text-xs font-semibold uppercase tracking-[0.16em] text-slate-600"
              key={header}
            >
              {header}
            </div>
          ))}
        </div>

        <div className="mt-3 space-y-3">
          {props.weeks.map((week) => (
            <div className="grid grid-cols-7 gap-3" key={week.weekIndex}>
              {week.days.map((day) => (
                <article
                  className={[
                    "min-h-[11.5rem] rounded-2xl border p-2.5",
                    resolveDayCellClasses({
                      isCurrentMonth: day.isCurrentMonth,
                      isWeekend: day.isWeekend
                    })
                  ].join(" ")}
                  key={day.date}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p
                        className={[
                          "text-sm font-semibold",
                          day.isCurrentMonth ? "text-slate-900" : "text-slate-400"
                        ].join(" ")}
                      >
                        {day.dayOfMonth}
                      </p>
                      <p className="text-[11px] uppercase tracking-[0.14em] text-slate-500">
                        {day.isWeekend ? "Weekend" : "Weekday"}
                      </p>
                    </div>

                    {day.extraShiftCount > 0 ? (
                      <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-700">
                        Other {day.extraShiftCount}
                      </span>
                    ) : null}
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <RosterShiftSlot slot={day.daySlot} />
                    <RosterShiftSlot slot={day.nightSlot} />
                  </div>
                </article>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
