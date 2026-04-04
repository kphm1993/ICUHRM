import type { YearMonthString } from "@/domain/models";
import { formatRosterMonth } from "@/features/roster/lib/formatters";

interface RosterWizardLaunchPanelProps {
  readonly selectedMonth: YearMonthString;
  readonly onSelectedMonthChange: (value: YearMonthString) => void;
  readonly onCreateDraft: () => void | Promise<unknown>;
  readonly isCreating: boolean;
  readonly draftCount: number;
}

export function RosterWizardLaunchPanel(props: RosterWizardLaunchPanelProps) {
  return (
    <section className="space-y-4 rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-panel">
      <header className="space-y-2">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-brand-700">
          Wizard
        </p>
        <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
          Generate Roster
        </h2>
        <p className="text-sm text-slate-600">
          Start the new step-by-step roster wizard without replacing the existing
          snapshot generation tools yet. Drafts stay resumable for the current admin.
        </p>
      </header>

      <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
        <label className="space-y-2">
          <span className="text-sm font-medium text-slate-700">Default roster month</span>
          <input
            className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:bg-white"
            onChange={(event) =>
              props.onSelectedMonthChange(event.target.value as YearMonthString)
            }
            type="month"
            value={props.selectedMonth}
          />
        </label>

        <button
          className="rounded-full bg-brand-700 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-800 disabled:cursor-not-allowed disabled:bg-brand-400"
          disabled={props.isCreating}
          onClick={() => void props.onCreateDraft()}
          type="button"
        >
          {props.isCreating ? "Creating..." : "Generate Roster"}
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Default Month
          </p>
          <p className="mt-2 text-base font-semibold text-slate-900">
            {formatRosterMonth(props.selectedMonth)}
          </p>
        </div>
        <div className="rounded-2xl bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Saved Drafts
          </p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">
            {props.draftCount}
          </p>
        </div>
      </div>
    </section>
  );
}
