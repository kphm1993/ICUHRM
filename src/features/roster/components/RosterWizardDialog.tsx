import { useEffect } from "react";
import type { RosterWizardDraft, RosterWizardStep } from "@/domain/models";
import { RosterWizardStepPlaceholder } from "@/features/roster/components/RosterWizardStepPlaceholder";
import {
  ROSTER_WIZARD_STEP_DEFINITIONS,
  RosterWizardStepper
} from "@/features/roster/components/RosterWizardStepper";
import { formatDateTime, formatRosterMonth } from "@/features/roster/lib/formatters";

interface RosterWizardDialogProps {
  readonly isOpen: boolean;
  readonly draft: RosterWizardDraft | null;
  readonly draftName: string;
  readonly activeAction:
    | "create"
    | "open"
    | "save"
    | "publish"
    | "lock"
    | "unlock"
    | "delete"
    | null;
  readonly onDraftNameChange: (value: string) => void;
  readonly onClose: () => void | Promise<unknown>;
  readonly onStepSelect: (step: RosterWizardStep) => void | Promise<unknown>;
  readonly onPreviousStep: () => void | Promise<unknown>;
  readonly onNextStep: () => void | Promise<unknown>;
  readonly onPublish: () => void | Promise<unknown>;
  readonly onLock: () => void | Promise<unknown>;
  readonly onUnlock: () => void | Promise<unknown>;
  readonly onDelete: () => void | Promise<unknown>;
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

export function RosterWizardDialog(props: RosterWizardDialogProps) {
  const draft = props.draft;

  useEffect(() => {
    if (!props.isOpen) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && props.activeAction === null) {
        void props.onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [props.activeAction, props.isOpen, props.onClose]);

  if (!props.isOpen || !draft) {
    return null;
  }

  const isLocked = draft.status === "LOCKED";
  const isBusy = props.activeAction !== null;
  const canGoBack = draft.currentStep > 1 && !isLocked && !isBusy;
  const canGoNext = draft.currentStep < 5 && !isLocked && !isBusy;
  const currentDefinition = ROSTER_WIZARD_STEP_DEFINITIONS.find(
    (definition) => definition.step === draft.currentStep
  );

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/55 p-4"
      onClick={() => {
        if (!isBusy) {
          void props.onClose();
        }
      }}
      role="presentation"
    >
      <section
        aria-modal="true"
        className="flex h-[calc(100vh-2rem)] w-full flex-col overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
      >
        <header className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-brand-700">
                Roster Wizard
              </p>
              <span
                className={[
                  "rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em]",
                  getStatusClasses(draft.status)
                ].join(" ")}
              >
                {draft.status}
              </span>
            </div>

            <label className="block space-y-2">
              <span className="text-sm font-medium text-slate-700">Draft name</span>
              <input
                className="w-full min-w-[18rem] rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:bg-white disabled:cursor-not-allowed disabled:opacity-70"
                disabled={isLocked || isBusy}
                onChange={(event) => props.onDraftNameChange(event.target.value)}
                type="text"
                value={props.draftName}
              />
            </label>

            <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-slate-600">
              <p>{formatRosterMonth(draft.rosterMonth)}</p>
              <p>Step {draft.currentStep} of 5</p>
              <p>Updated {formatDateTime(draft.updatedAt)}</p>
              <p>{currentDefinition?.title ?? "Wizard step"}</p>
            </div>
          </div>

          <button
            className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-brand-300 hover:text-brand-800 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isBusy}
            onClick={() => void props.onClose()}
            type="button"
          >
            Close
          </button>
        </header>

        <div className="grid min-h-0 flex-1 gap-6 overflow-hidden px-6 py-6 lg:grid-cols-[20rem_1fr]">
          <div className="min-h-0 overflow-auto">
            <RosterWizardStepper
              currentStep={draft.currentStep}
              status={draft.status}
              isBusy={isBusy}
              onStepSelect={props.onStepSelect}
            />
          </div>

          <div className="min-h-0 overflow-auto">
            <RosterWizardStepPlaceholder currentStep={draft.currentStep} />
          </div>
        </div>

        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-6 py-4">
          <div className="flex flex-wrap gap-3">
            {draft.status === "DRAFT" ? (
              <button
                className="rounded-full border border-brand-300 bg-brand-50 px-4 py-2 text-sm font-semibold text-brand-800 transition hover:bg-brand-100 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isBusy}
                onClick={() => void props.onPublish()}
                type="button"
              >
                {props.activeAction === "publish" ? "Publishing..." : "Publish Draft"}
              </button>
            ) : null}

            {draft.status === "PUBLISHED" ? (
              <button
                className="rounded-full border border-slate-300 bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isBusy}
                onClick={() => void props.onLock()}
                type="button"
              >
                {props.activeAction === "lock" ? "Locking..." : "Lock Draft"}
              </button>
            ) : null}

            {draft.status === "LOCKED" ? (
              <button
                className="rounded-full border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-900 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isBusy}
                onClick={() => void props.onUnlock()}
                type="button"
              >
                {props.activeAction === "unlock" ? "Unlocking..." : "Unlock Draft"}
              </button>
            ) : null}

            <button
              className="rounded-full border border-rose-300 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-800 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isBusy}
              onClick={() => {
                if (
                  window.confirm(
                    `Delete wizard draft '${draft.name}'? This removes the saved wizard progress.`
                  )
                ) {
                  void props.onDelete();
                }
              }}
              type="button"
            >
              {props.activeAction === "delete" ? "Deleting..." : "Delete Draft"}
            </button>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-brand-300 hover:text-brand-800 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={!canGoBack}
              onClick={() => void props.onPreviousStep()}
              type="button"
            >
              Back
            </button>
            <button
              className="rounded-full bg-brand-700 px-5 py-2 text-sm font-semibold text-white transition hover:bg-brand-800 disabled:cursor-not-allowed disabled:bg-brand-400"
              disabled={!canGoNext}
              onClick={() => void props.onNextStep()}
              type="button"
            >
              {props.activeAction === "save" ? "Saving..." : "Next"}
            </button>
          </div>
        </footer>
      </section>
    </div>
  );
}
