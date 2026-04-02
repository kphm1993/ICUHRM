import type { RosterDoctorSummaryRow } from "@/features/roster/selectors/rosterReviewSelectors";
import {
  formatBiasBalance,
  formatWeekdayPairBiasBalance
} from "@/features/roster/lib/formatters";

interface FairnessComparisonTableProps {
  readonly rows: ReadonlyArray<RosterDoctorSummaryRow>;
}

export function FairnessComparisonTable(props: FairnessComparisonTableProps) {
  return (
    <section className="space-y-4 rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-panel">
      <header>
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-brand-700">
          Fairness Comparison
        </p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
          Doctor By Doctor Comparison
        </h2>
      </header>

      <div className="space-y-3">
        {props.rows.map((row) => (
          <article
            key={row.doctorId}
            className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-base font-semibold text-slate-900">{row.doctorName}</h3>
              <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-600">
                Total {row.totalAssigned}
              </span>
            </div>

            <div className="mt-3 grid gap-3 sm:grid-cols-4">
              <div className="rounded-xl bg-white px-3 py-2 text-sm text-slate-700">
                WD Day: <span className="font-semibold text-slate-900">{row.weekdayDay}</span>
              </div>
              <div className="rounded-xl bg-white px-3 py-2 text-sm text-slate-700">
                WD Night: <span className="font-semibold text-slate-900">{row.weekdayNight}</span>
              </div>
              <div className="rounded-xl bg-white px-3 py-2 text-sm text-slate-700">
                WE Day: <span className="font-semibold text-slate-900">{row.weekendDay}</span>
              </div>
              <div className="rounded-xl bg-white px-3 py-2 text-sm text-slate-700">
                WE Night: <span className="font-semibold text-slate-900">{row.weekendNight}</span>
              </div>
            </div>

            <div className="mt-3 space-y-2 text-sm text-slate-700">
              <p>
                <span className="font-semibold text-slate-900">Carry-forward bias:</span>{" "}
                {formatBiasBalance(row.currentBias)}
              </p>
              <p>
                <span className="font-semibold text-slate-900">Weekday-pair bias:</span>{" "}
                {formatWeekdayPairBiasBalance(row.currentWeekdayPairBias)}
              </p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
