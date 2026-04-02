import type { Doctor, RosterSnapshot, Shift } from "@/domain/models";
import { formatRosterDate } from "@/features/roster/lib/formatters";

interface RosterCalendarProps {
  readonly snapshot: RosterSnapshot;
  readonly doctors: ReadonlyArray<Doctor>;
}

function sortShifts(left: Shift, right: Shift): number {
  const dateComparison = left.date.localeCompare(right.date);
  if (dateComparison !== 0) {
    return dateComparison;
  }

  const startTimeComparison = left.startTime.localeCompare(right.startTime);
  return startTimeComparison !== 0
    ? startTimeComparison
    : left.definitionSnapshot.code.localeCompare(right.definitionSnapshot.code);
}

function resolveShiftCardClasses(shift: Shift): string {
  if (shift.category === "WEEKEND") {
    return "border-amber-200 bg-amber-50";
  }

  if (shift.special === "FRIDAY_NIGHT") {
    return "border-orange-200 bg-orange-50";
  }

  return shift.type === "NIGHT"
    ? "border-slate-300 bg-slate-100"
    : "border-sky-200 bg-sky-50";
}

export function RosterCalendar(props: RosterCalendarProps) {
  const doctorsById = new Map(props.doctors.map((doctor) => [doctor.id, doctor] as const));
  const assignmentsByShiftId = new Map(
    props.snapshot.assignments.map((assignment) => [assignment.shiftId, assignment] as const)
  );
  const shiftsByDate = props.snapshot.shifts
    .slice()
    .sort(sortShifts)
    .reduce<Map<string, Shift[]>>((result, shift) => {
      const currentDateShifts = result.get(shift.date) ?? [];
      currentDateShifts.push(shift);
      result.set(shift.date, currentDateShifts);
      return result;
    }, new Map());

  return (
    <section className="space-y-4 rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-panel">
      <header>
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-brand-700">
          Calendar Review
        </p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
          Shift Assignments
        </h2>
      </header>

      <div className="grid gap-4 lg:grid-cols-2">
        {Array.from(shiftsByDate.entries()).map(([date, shifts]) => (
          <section
            key={date}
            className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4"
          >
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-base font-semibold text-slate-900">
                {formatRosterDate(date)}
              </h3>
              <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">
                {shifts[0]?.category ?? "WEEKDAY"}
              </span>
            </div>

            <div className="mt-3 space-y-3">
              {shifts.map((shift) => {
                const assignment = assignmentsByShiftId.get(shift.id);
                const doctor = assignment
                  ? doctorsById.get(assignment.assignedDoctorId)
                  : null;

                return (
                  <article
                    key={shift.id}
                    className={[
                      "rounded-2xl border px-4 py-3",
                      resolveShiftCardClasses(shift)
                    ].join(" ")}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-700">
                          {shift.definitionSnapshot.label}
                        </p>
                        <p className="mt-1 text-sm text-slate-600">
                          {shift.startTime} - {shift.endTime}
                        </p>
                      </div>
                      {shift.special === "FRIDAY_NIGHT" ? (
                        <span className="rounded-full bg-orange-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-orange-800">
                          Friday Night
                        </span>
                      ) : null}
                    </div>

                    <div className="mt-3 rounded-xl bg-white/80 px-3 py-2 text-sm text-slate-700">
                      {doctor ? (
                        <span className="font-medium text-slate-900">{doctor.name}</span>
                      ) : (
                        <span className="font-medium text-rose-700">Unassigned</span>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </section>
  );
}
