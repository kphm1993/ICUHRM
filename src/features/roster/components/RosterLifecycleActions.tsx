import type { RosterSnapshot } from "@/domain/models";
import { formatDateTime } from "@/features/roster/lib/formatters";

interface RosterLifecycleActionsProps {
  readonly latestDraft: RosterSnapshot | null;
  readonly activeOfficial: RosterSnapshot | null;
  readonly visibleSnapshot: RosterSnapshot | null;
  readonly viewMode: "draft" | "official";
  readonly onViewModeChange: (value: "draft" | "official") => void;
  readonly canPublish: boolean;
  readonly canLock: boolean;
  readonly canDelete: boolean;
  readonly canUnlock: boolean;
  readonly activeAction:
    | "generate"
    | "publish"
    | "lock"
    | "unlock"
    | "delete"
    | null;
  readonly onPublish: () => void | Promise<unknown>;
  readonly onLock: () => void | Promise<unknown>;
  readonly onUnlock: () => void | Promise<unknown>;
  readonly onDelete: () => void | Promise<unknown>;
}

function renderSnapshotMeta(snapshot: RosterSnapshot | null, emptyLabel: string) {
  if (!snapshot) {
    return <p className="mt-2 text-sm text-slate-500">{emptyLabel}</p>;
  }

  return (
    <div className="mt-2 space-y-1 text-sm text-slate-600">
      <p>Status: {snapshot.roster.status}</p>
      <p>Created: {formatDateTime(snapshot.roster.createdAt)}</p>
      <p>Warnings: {snapshot.warnings.length}</p>
      <p>Validation: {snapshot.validation.isValid ? "Pass" : "Issues present"}</p>
    </div>
  );
}

export function RosterLifecycleActions(props: RosterLifecycleActionsProps) {
  return (
    <section className="space-y-4 rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-panel">
      <header className="space-y-2">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-brand-700">
          Lifecycle
        </p>
        <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
          Draft, Publish, Lock
        </h2>
        <p className="text-sm text-slate-600">
          Publish creates the official roster snapshot. Lock creates a final immutable
          locked snapshot and blocks off-request changes for the month.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-700">
              Latest Draft
            </h3>
            <button
              className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-brand-400 hover:text-brand-800 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={!props.latestDraft}
              onClick={() => props.onViewModeChange("draft")}
              type="button"
            >
              Review Draft
            </button>
          </div>
          {renderSnapshotMeta(props.latestDraft, "No draft has been generated for this month.")}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-700">
              Active Official
            </h3>
            <button
              className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-brand-400 hover:text-brand-800 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={!props.activeOfficial}
              onClick={() => props.onViewModeChange("official")}
              type="button"
            >
              Review Official
            </button>
          </div>
          {renderSnapshotMeta(
            props.activeOfficial,
            "No published or locked roster exists for this month."
          )}
        </section>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="rounded-full bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700">
          Reviewing: {props.viewMode === "draft" ? "Latest Draft" : "Active Official"}
        </div>
        <div className="flex flex-wrap gap-3">
          {props.visibleSnapshot?.roster.status === "LOCKED" ? (
            <button
              className="rounded-full border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-900 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={!props.canUnlock || props.activeAction !== null}
              onClick={() => {
                if (
                  window.confirm(
                    "Unlock this roster? It will become published again and can then be deleted."
                  )
                ) {
                  void props.onUnlock();
                }
              }}
              type="button"
            >
              {props.activeAction === "unlock" ? "Unlocking..." : "Unlock Roster"}
            </button>
          ) : null}
          <button
            className="rounded-full border border-brand-300 bg-brand-50 px-4 py-2 text-sm font-semibold text-brand-800 transition hover:bg-brand-100 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!props.canPublish || props.activeAction !== null}
            onClick={() => void props.onPublish()}
            type="button"
          >
            {props.activeAction === "publish" ? "Publishing..." : "Publish Draft"}
          </button>
          <button
            className="rounded-full border border-slate-300 bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!props.canLock || props.activeAction !== null}
            onClick={() => void props.onLock()}
            type="button"
          >
            {props.activeAction === "lock" ? "Locking..." : "Lock Official Roster"}
          </button>
          {props.visibleSnapshot &&
          props.visibleSnapshot.roster.status !== "LOCKED" &&
          !props.visibleSnapshot.roster.isDeleted ? (
            <button
              className="rounded-full border border-rose-300 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-800 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={!props.canDelete || props.activeAction !== null}
              onClick={() => {
                if (window.confirm("Delete this roster? This cannot be undone from the UI.")) {
                  void props.onDelete();
                }
              }}
              type="button"
            >
              {props.activeAction === "delete" ? "Deleting..." : "Delete Roster"}
            </button>
          ) : null}
        </div>
      </div>
    </section>
  );
}
