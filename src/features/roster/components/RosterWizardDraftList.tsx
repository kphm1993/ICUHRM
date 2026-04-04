import type { RosterWizardDraft } from "@/domain/models";
import { formatDateTime, formatRosterMonth } from "@/features/roster/lib/formatters";

interface RosterWizardDraftListProps {
  readonly drafts: ReadonlyArray<RosterWizardDraft>;
  readonly activeDraftId: string | null;
  readonly isLoading: boolean;
  readonly isBusy: boolean;
  readonly onResumeDraft: (draftId: string) => void | Promise<unknown>;
}

function getStatusClasses(status: RosterWizardDraft["status"]): string {
  switch (status) {
    case "LOCKED":
      return "bg-slate-900 text-white";
    case "PUBLISHED":
      return "bg-amber-100 text-amber-900";
    default:
      return "bg-emerald-100 text-emerald-900";
  }
}

export function RosterWizardDraftList(props: RosterWizardDraftListProps) {
  return (
    <section className="space-y-4 rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-panel">
      <header className="space-y-2">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-brand-700">
          Saved Drafts
        </p>
        <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
          Resume Wizard Drafts
        </h2>
        <p className="text-sm text-slate-600">
          Drafts are scoped to the current admin account and reload from browser
          storage automatically.
        </p>
      </header>

      {props.isLoading ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-600">
          Loading saved wizard drafts...
        </div>
      ) : null}

      {!props.isLoading && props.drafts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-brand-300 bg-brand-50/70 px-4 py-5 text-sm text-brand-900">
          No saved wizard drafts exist yet. Create one to begin the new roster flow.
        </div>
      ) : null}

      {!props.isLoading ? (
        <div className="space-y-3">
          {props.drafts.map((draft) => {
            const isActive = props.activeDraftId === draft.id;

            return (
              <article
                className={[
                  "rounded-2xl border px-4 py-4 transition",
                  isActive
                    ? "border-brand-300 bg-brand-50/70"
                    : "border-slate-200 bg-slate-50/80"
                ].join(" ")}
                key={draft.id}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-semibold text-slate-900">{draft.name}</h3>
                      <span
                        className={[
                          "rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em]",
                          getStatusClasses(draft.status)
                        ].join(" ")}
                      >
                        {draft.status}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600">
                      {formatRosterMonth(draft.rosterMonth)} | Step {draft.currentStep} of 5
                    </p>
                    <p className="text-sm text-slate-500">
                      Updated {formatDateTime(draft.updatedAt)}
                    </p>
                  </div>

                  <button
                    className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-brand-300 hover:text-brand-800 disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={props.isBusy}
                    onClick={() => void props.onResumeDraft(draft.id)}
                    type="button"
                  >
                    Resume
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}
