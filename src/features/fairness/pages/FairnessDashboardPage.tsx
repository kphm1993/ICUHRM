import { FairnessComparisonTable } from "@/features/fairness/components/FairnessComparisonTable";
import { useRosterView } from "@/features/roster/hooks/useRosterView";
import { formatDateTime, formatRosterMonth } from "@/features/roster/lib/formatters";

export function FairnessDashboardPage() {
  const rosterView = useRosterView();

  return (
    <section className="space-y-6">
      <header className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-panel">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-brand-700">
          Fairness
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">
          Fairness Dashboard
        </h1>
        <p className="mt-3 max-w-3xl text-sm text-slate-600 sm:text-base">
          Compare doctor totals, weekday and weekend bucket counts, and the
          carry-forward bias values that apply to the selected month.
        </p>
      </header>

      <section className="rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-panel">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <label className="space-y-2">
            <span className="text-sm font-medium text-slate-700">Roster month</span>
            <input
              className="w-full max-w-xs rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:bg-white"
              type="month"
              value={rosterView.selectedMonth}
              onChange={(event) =>
                rosterView.setSelectedMonth(event.target.value as typeof rosterView.selectedMonth)
              }
            />
          </label>

          <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
            {rosterView.visibleSnapshot ? (
              <>
                <p className="font-semibold text-slate-900">
                  Reference snapshot:{" "}
                  {formatRosterMonth(
                    rosterView.visibleSnapshot.generatedInputSummary.rosterMonth
                  )}
                </p>
                <p className="mt-1">
                  {rosterView.visibleSnapshot.roster.status} • Created{" "}
                  {formatDateTime(rosterView.visibleSnapshot.roster.createdAt)}
                </p>
              </>
            ) : (
              <p className="font-medium text-slate-700">
                No official roster snapshot exists yet for this month.
              </p>
            )}
          </div>
        </div>
      </section>

      {rosterView.errorMessage ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
          {rosterView.errorMessage}
        </div>
      ) : null}

      {rosterView.isLoading ? (
        <div className="rounded-2xl border border-slate-200 bg-white/90 px-4 py-6 text-sm text-slate-600 shadow-panel">
          Loading fairness data...
        </div>
      ) : (
        <FairnessComparisonTable rows={rosterView.comparisonRows} />
      )}
    </section>
  );
}
