import type { RosterWizardDraft, RosterWizardStep } from "@/domain/models";

export const ROSTER_WIZARD_STEP_DEFINITIONS = [
  {
    step: 1 as const,
    title: "Period & Holidays",
    summary: "Define the roster month, range, and public holidays."
  },
  {
    step: 2 as const,
    title: "Groups & Exclusions",
    summary: "Apply group constraint templates and doctor exclusions."
  },
  {
    step: 3 as const,
    title: "Duty Designs",
    summary: "Map duty designs to calendar dates and holiday overrides."
  },
  {
    step: 4 as const,
    title: "Shift Allocation",
    summary: "Assign doctors with live bias-aware suggestions."
  },
  {
    step: 5 as const,
    title: "Review & Publish",
    summary: "Review workload, bias, and publish the wizard draft."
  }
] as const satisfies ReadonlyArray<{
  readonly step: RosterWizardStep;
  readonly title: string;
  readonly summary: string;
}>;

interface RosterWizardStepperProps {
  readonly currentStep: RosterWizardStep;
  readonly status: RosterWizardDraft["status"];
  readonly isBusy: boolean;
  readonly onStepSelect: (step: RosterWizardStep) => void | Promise<unknown>;
}

export function RosterWizardStepper(props: RosterWizardStepperProps) {
  return (
    <nav aria-label="Roster wizard steps" className="space-y-3">
      {ROSTER_WIZARD_STEP_DEFINITIONS.map((definition) => {
        const isCurrent = definition.step === props.currentStep;
        const isLocked = props.status === "LOCKED";

        return (
          <button
            className={[
              "flex w-full items-start gap-3 rounded-2xl border px-4 py-3 text-left transition",
              isCurrent
                ? "border-brand-300 bg-brand-50 text-brand-950"
                : "border-slate-200 bg-white text-slate-700 hover:border-brand-200 hover:bg-brand-50/40"
            ].join(" ")}
            disabled={props.isBusy || isLocked}
            key={definition.step}
            onClick={() => void props.onStepSelect(definition.step)}
            type="button"
          >
            <span
              className={[
                "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold",
                isCurrent ? "bg-brand-700 text-white" : "bg-slate-100 text-slate-700"
              ].join(" ")}
            >
              {definition.step}
            </span>

            <span className="space-y-1">
              <span className="block text-sm font-semibold">{definition.title}</span>
              <span className="block text-sm text-slate-500">{definition.summary}</span>
            </span>
          </button>
        );
      })}
    </nav>
  );
}
