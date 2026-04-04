import { Link } from "react-router-dom";
import { AdminToolsSubnav } from "@/features/admin/components/AdminToolsSubnav";

export function AdminSettingsPage() {
  return (
    <section className="space-y-6">
      <header className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-panel">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-brand-700">
          Admin
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">
          Admin Tools
        </h1>
        <p className="mt-3 max-w-3xl text-sm text-slate-600 sm:text-base">
          Access roster lifecycle controls, doctor management, and scheduling
          configuration from one admin-only area without mixing those tools into the
          roster review surface.
        </p>
      </header>

      <AdminToolsSubnav />

      <section className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-panel">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-brand-700">
            Workflow
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
            Roster Workflow Tools
          </h2>
          <p className="mt-3 text-sm text-slate-600">
            Generate draft rosters, publish official snapshots, and lock final months
            without leaving the admin tools area.
          </p>
          <div className="mt-4">
            <Link
              className="inline-flex rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-brand-300 hover:text-brand-800"
              to="/admin/rosters"
            >
              Open Rosters
            </Link>
          </div>
        </article>

        <article className="rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-panel">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-brand-700">
            Base Data
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
            Doctor Management
          </h2>
          <p className="mt-3 text-sm text-slate-600">
            Maintain doctors, weekend groups, and active status safely without
            rewriting historical roster meaning.
          </p>
          <div className="mt-4">
            <Link
              className="inline-flex rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-brand-300 hover:text-brand-800"
              to="/admin/doctors"
            >
              Manage Doctors
            </Link>
          </div>
        </article>

        <article className="rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-panel">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-brand-700">
            Configuration
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
            Shift Types Manager
          </h2>
          <p className="mt-3 text-sm text-slate-600">
            Maintain persisted day, night, and custom shift definitions with
            explicit timing and active-status control.
          </p>
          <div className="mt-4">
            <Link
              className="inline-flex rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-brand-300 hover:text-brand-800"
              to="/admin/shift-types"
            >
              Manage Shift Types
            </Link>
          </div>
        </article>

        <article className="rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-panel">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-brand-700">
            Configuration
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
            Duty Designs Manager
          </h2>
          <p className="mt-3 text-sm text-slate-600">
            Create reusable duty-block patterns with shift type, location, and
            follow-up rules for future scheduling extensions.
          </p>
          <div className="mt-4">
            <Link
              className="inline-flex rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-brand-300 hover:text-brand-800"
              to="/admin/duty-designs"
            >
              Manage Duty Designs
            </Link>
          </div>
        </article>

        <article className="rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-panel">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-brand-700">
            Configuration
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
            Duty Design Assignments
          </h2>
          <p className="mt-3 text-sm text-slate-600">
            Assign duty designs across calendar dates with explicit holiday override
            handling and stacked per-day visibility.
          </p>
          <div className="mt-4">
            <Link
              className="inline-flex rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-brand-300 hover:text-brand-800"
              to="/admin/duty-design-assignments"
            >
              Open Duty Design Assignments
            </Link>
          </div>
        </article>

        <article className="rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-panel">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-brand-700">
            Configuration
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
            Duty Locations Manager
          </h2>
          <p className="mt-3 text-sm text-slate-600">
            Create and maintain persisted duty locations that future roster rules and
            criteria can reference explicitly.
          </p>
          <div className="mt-4">
            <Link
              className="inline-flex rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-brand-300 hover:text-brand-800"
              to="/admin/locations"
            >
              Manage Duty Locations
            </Link>
          </div>
        </article>

        <article className="rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-panel">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-brand-700">
            Configuration
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
            Bias Criteria Manager
          </h2>
          <p className="mt-3 text-sm text-slate-600">
            Manage the criteria that now drive future roster scoring while keeping
            older roster snapshots historically unchanged.
          </p>
          <div className="mt-4">
            <Link
              className="inline-flex rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-brand-300 hover:text-brand-800"
              to="/admin/bias-criteria"
            >
              Manage Bias Criteria
            </Link>
          </div>
        </article>
      </section>
    </section>
  );
}
