import type { RosterWizardStep } from "@/domain/models";
import { ROSTER_WIZARD_STEP_DEFINITIONS } from "@/features/roster/components/RosterWizardStepper";

interface RosterWizardStepPlaceholderProps {
  readonly currentStep: RosterWizardStep;
}

export function RosterWizardStepPlaceholder(
  props: RosterWizardStepPlaceholderProps
) {
  const currentDefinition = ROSTER_WIZARD_STEP_DEFINITIONS.find(
    (definition) => definition.step === props.currentStep
  );

  if (!currentDefinition) {
    return null;
  }

  return (
    <section className="space-y-4 rounded-3xl border border-slate-200 bg-slate-50/80 p-5">
      <header className="space-y-2">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-brand-700">
          Step {currentDefinition.step}
        </p>
        <h3 className="text-2xl font-semibold tracking-tight text-slate-900">
          {currentDefinition.title}
        </h3>
        <p className="text-sm text-slate-600">{currentDefinition.summary}</p>
      </header>

      <div className="rounded-2xl border border-dashed border-brand-300 bg-white px-4 py-5 text-sm text-slate-700">
        Prompt 1 ships the shared wizard shell only. This step is intentionally a
        placeholder until the dedicated step implementation prompt is applied.
      </div>
    </section>
  );
}
