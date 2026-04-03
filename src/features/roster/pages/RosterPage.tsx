import { useAuth } from "@/features/auth/context/AuthContext";
import { useAdminRosterWorkflow } from "@/features/roster/hooks/useAdminRosterWorkflow";
import { useRosterView } from "@/features/roster/hooks/useRosterView";
import { formatDateTime, formatRosterMonth } from "@/features/roster/lib/formatters";
import { buildRosterDoctorSummaryRows } from "@/features/roster/selectors/rosterReviewSelectors";
import { RosterCalendar } from "@/features/roster/components/RosterCalendar";
import { RosterDoctorSummaryTable } from "@/features/roster/components/RosterDoctorSummaryTable";
import { RosterValidationPanel } from "@/features/roster/components/RosterValidationPanel";
import { RosterWarningsPanel } from "@/features/roster/components/RosterWarningsPanel";

function AdminRosterPage() {
  const workflow = useAdminRosterWorkflow();
  const summaryRows = buildRosterDoctorSummaryRows({
    doctors: workflow.monthContext?.activeDoctors ?? [],
    snapshot: workflow.displaySnapshot,
    currentBias: workflow.monthContext?.currentBias ?? [],
    currentWeekdayPairBias: workflow.monthContext?.currentWeekdayPairBias ?? [],
    activeBiasCriteria: workflow.monthContext?.activeBiasCriteria ?? []
  });

  return (
    <section className="space-y-6">
      {workflow.errorMessage ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
          {workflow.errorMessage}
        </div>
      ) : null}

      {workflow.isLoading ? (
        <div className="rounded-2xl border border-slate-200 bg-white/90 px-4 py-6 text-sm text-slate-600 shadow-panel">
          Loading roster workflow data...
        </div>
      ) : null}

      {!workflow.isLoading && workflow.displaySnapshot ? (
        <>
          <section className="rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-panel">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-brand-700">
                  Snapshot Review
                </p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
                  {formatRosterMonth(workflow.displaySnapshot.generatedInputSummary.rosterMonth)}
                </h2>
              </div>
              <div className="space-y-1 text-sm text-slate-600">
                <p>Status: {workflow.displaySnapshot.roster.status}</p>
                <p>Created: {formatDateTime(workflow.displaySnapshot.roster.createdAt)}</p>
                {workflow.displaySnapshot.roster.publishedAt ? (
                  <p>
                    Published:{" "}
                    {formatDateTime(workflow.displaySnapshot.roster.publishedAt)}
                  </p>
                ) : null}
                {workflow.displaySnapshot.roster.lockedAt ? (
                  <p>Locked: {formatDateTime(workflow.displaySnapshot.roster.lockedAt)}</p>
                ) : null}
              </div>
            </div>
          </section>

          <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
            <div className="space-y-6">
              <RosterWarningsPanel warnings={workflow.displaySnapshot.warnings} />
              <RosterValidationPanel validation={workflow.displaySnapshot.validation} />
            </div>

            <RosterDoctorSummaryTable rows={summaryRows} />
          </div>

          <RosterCalendar
            snapshot={workflow.displaySnapshot}
            doctors={workflow.monthContext?.activeDoctors ?? []}
          />
        </>
      ) : null}

      {!workflow.isLoading && !workflow.displaySnapshot ? (
        <div className="rounded-2xl border border-dashed border-brand-300 bg-brand-50/70 px-4 py-5 text-sm text-brand-900">
          No roster snapshot exists for this month yet. Generate a draft to begin review.
        </div>
      ) : null}
    </section>
  );
}

function DoctorRosterPage() {
  const rosterView = useRosterView();

  return (
    <section className="space-y-6">
      <header className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-panel">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-brand-700">
          Official Roster
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">
          Read-Only Active Roster
        </h1>
        <p className="mt-3 max-w-3xl text-sm text-slate-600 sm:text-base">
          Doctors only see the active published or locked roster for the selected month.
        </p>
      </header>

      <section className="rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-panel">
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
      </section>

      {rosterView.errorMessage ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
          {rosterView.errorMessage}
        </div>
      ) : null}

      {rosterView.isLoading ? (
        <div className="rounded-2xl border border-slate-200 bg-white/90 px-4 py-6 text-sm text-slate-600 shadow-panel">
          Loading official roster...
        </div>
      ) : null}

      {!rosterView.isLoading && rosterView.visibleSnapshot ? (
        <>
          <section className="rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-panel">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-brand-700">
                  Active Snapshot
                </p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
                  {formatRosterMonth(rosterView.visibleSnapshot.generatedInputSummary.rosterMonth)}
                </h2>
              </div>
              <span className="rounded-full bg-brand-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-brand-800">
                {rosterView.visibleSnapshot.roster.status}
              </span>
            </div>
          </section>

          <RosterCalendar
            snapshot={rosterView.visibleSnapshot}
            doctors={rosterView.monthContext?.activeDoctors ?? []}
          />
        </>
      ) : null}

      {!rosterView.isLoading && !rosterView.visibleSnapshot ? (
        <div className="rounded-2xl border border-dashed border-brand-300 bg-brand-50/70 px-4 py-5 text-sm text-brand-900">
          No published or locked roster is available for this month yet.
        </div>
      ) : null}
    </section>
  );
}

export function RosterPage() {
  const { role } = useAuth();

  return role === "ADMIN" ? <AdminRosterPage /> : <DoctorRosterPage />;
}
