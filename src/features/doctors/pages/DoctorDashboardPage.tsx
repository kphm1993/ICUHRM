import { Link } from "react-router-dom";

export function DoctorDashboardPage() {
  return (
    <section className="space-y-6">
      <header className="rounded-3xl border border-slate-200 bg-white/85 p-6 shadow-panel backdrop-blur">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-brand-700">
          Doctor
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">
          Doctor Dashboard
        </h1>
        <p className="mt-3 max-w-3xl text-sm text-slate-600 sm:text-base">
          Open your monthly roster calendar, then expand into leave requests, fairness,
          and exchange flows as the doctor workspace grows.
        </p>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white/85 p-5 shadow-sm backdrop-blur">
        <h2 className="text-lg font-semibold text-slate-900">Primary action</h2>
        <p className="mt-2 text-sm text-slate-600">
          Review the official roster in a calendar view with day and night splits and
          optional doctor highlighting.
        </p>
        <div className="mt-4">
          <Link
            className="inline-flex rounded-full bg-brand-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-800"
            to="/dashboard/roster-calendar"
          >
            Open Roster Calendar
          </Link>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white/80 p-5 shadow-sm backdrop-blur">
        <h2 className="text-lg font-semibold text-slate-900">Next dashboard steps</h2>
        <ul className="mt-3 space-y-3 text-sm text-slate-600">
          <li className="rounded-xl bg-slate-50 px-3 py-2">
            Personal duty list with upcoming day and night shifts.
          </li>
          <li className="rounded-xl bg-slate-50 px-3 py-2">
            Bias and fairness summary separated by weekday and weekend categories.
          </li>
          <li className="rounded-xl bg-slate-50 px-3 py-2">
            Quick links for leave, off requests, and exchange actions.
          </li>
        </ul>
      </section>
    </section>
  );
}
