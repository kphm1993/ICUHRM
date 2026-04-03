import { Link } from "react-router-dom";
import { RosterCalendar } from "@/features/roster/components/RosterCalendar";
import { useRosterView } from "@/features/roster/hooks/useRosterView";
import { formatRosterMonth } from "@/features/roster/lib/formatters";

export function DoctorRosterCalendarPage() {
  const rosterView = useRosterView();
  const visibleSnapshot = rosterView.monthContext?.activeOfficial ?? null;

  return (
    <section className="space-y-6">
      <header className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-panel">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-brand-700">
          Doctor Roster
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">
          Monthly Roster Calendar
        </h1>
        <p className="mt-3 max-w-3xl text-sm text-slate-600 sm:text-base">
          Review the official roster month by month, with day and night coverage split
          into separate cells and optional doctor highlighting for quick tracing.
        </p>
        <div className="mt-4">
          <Link
            className="inline-flex rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-brand-400 hover:text-brand-800"
            to="/doctor-dashboard"
          >
            Back to Doctor Dashboard
          </Link>
        </div>
      </header>

      <section className="rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-panel">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <label className="space-y-2">
            <span className="text-sm font-medium text-slate-700">Roster month</span>
            <input
              className="w-full max-w-xs rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:bg-white"
              onChange={(event) =>
                rosterView.setSelectedMonth(
                  event.target.value as typeof rosterView.selectedMonth
                )
              }
              type="month"
              value={rosterView.selectedMonth}
            />
          </label>

          <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
            {visibleSnapshot ? (
              <>
                <p className="font-semibold text-slate-900">
                  Active snapshot:{" "}
                  {formatRosterMonth(
                    visibleSnapshot?.generatedInputSummary.rosterMonth ??
                      rosterView.selectedMonth
                  )}
                </p>
                <p className="mt-1">{visibleSnapshot?.roster.status ?? "Unavailable"}</p>
              </>
            ) : (
              <p className="font-medium text-slate-700">
                No published or locked roster is available for this month yet.
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
          Loading doctor roster calendar...
        </div>
      ) : null}

      {!rosterView.isLoading && visibleSnapshot ? (
        <RosterCalendar
          doctors={rosterView.monthContext?.activeDoctors ?? []}
          snapshot={visibleSnapshot}
        />
      ) : null}

      {!rosterView.isLoading && !visibleSnapshot ? (
        <div className="rounded-2xl border border-dashed border-brand-300 bg-brand-50/70 px-4 py-5 text-sm text-brand-900">
          No published or locked roster is available for this month yet.
        </div>
      ) : null}
    </section>
  );
}
