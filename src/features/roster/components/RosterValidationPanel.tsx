import type { ValidationResult } from "@/domain/scheduling/contracts";

interface RosterValidationPanelProps {
  readonly validation: ValidationResult;
}

export function RosterValidationPanel(props: RosterValidationPanelProps) {
  return (
    <section className="space-y-3 rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-panel">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-brand-700">
            Validation
          </p>
          <h2 className="mt-2 text-xl font-semibold tracking-tight text-slate-900">
            Hard Constraint Check
          </h2>
        </div>
        <span
          className={[
            "rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em]",
            props.validation.isValid
              ? "bg-emerald-100 text-emerald-800"
              : "bg-rose-100 text-rose-800"
          ].join(" ")}
        >
          {props.validation.isValid ? "Pass" : "Issues Found"}
        </span>
      </div>

      {props.validation.issues.length > 0 ? (
        <ul className="space-y-2 text-sm text-slate-700">
          {props.validation.issues.map((issue) => (
            <li key={`${issue.code}:${issue.shiftId ?? issue.assignmentId ?? issue.message}`} className="rounded-2xl bg-slate-50 px-4 py-3">
              <p className="font-semibold text-slate-900">{issue.code}</p>
              <p className="mt-1">{issue.message}</p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          Every generated shift is assigned and no current hard-rule violation was found.
        </p>
      )}
    </section>
  );
}
