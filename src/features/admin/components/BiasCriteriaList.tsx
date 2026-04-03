import type { BiasCriteria, DutyLocation, ShiftType } from "@/domain/models";
import { summarizeBiasCriteria } from "@/features/admin/services/biasCriteriaPreview";

interface BiasCriteriaListProps {
  readonly criteriaEntries: ReadonlyArray<BiasCriteria>;
  readonly locations: ReadonlyArray<DutyLocation>;
  readonly shiftTypes: ReadonlyArray<ShiftType>;
  readonly selectedCriteriaId: string | null;
  readonly isLoading: boolean;
  readonly onCreateCriteria: () => void;
  readonly onSelectCriteria: (criteriaId: string) => void;
}

function getStatusClasses(isActive: boolean) {
  return isActive
    ? "bg-emerald-100 text-emerald-800"
    : "bg-slate-200 text-slate-700";
}

export function BiasCriteriaList(props: BiasCriteriaListProps) {
  return (
    <section className="space-y-4 rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-panel">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-brand-700">
            Bias Criteria
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
            Criteria Records
          </h2>
        </div>

        <button
          className="rounded-full bg-brand-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-800"
          onClick={props.onCreateCriteria}
          type="button"
        >
          Add Criteria
        </button>
      </div>

      {props.isLoading ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-600">
          Loading bias criteria...
        </div>
      ) : null}

      {!props.isLoading && props.criteriaEntries.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-brand-300 bg-brand-50/70 px-4 py-5 text-sm text-brand-900">
          No bias criteria exist yet. Add the first criteria record to prepare for
          dynamic fairness rules in the next phase.
        </div>
      ) : null}

      {!props.isLoading ? (
        <div className="space-y-3">
          {props.criteriaEntries.map((criteria) => (
            <button
              key={criteria.id}
              className={[
                "w-full rounded-2xl border px-4 py-4 text-left transition",
                props.selectedCriteriaId === criteria.id
                  ? "border-brand-400 bg-brand-50 shadow-sm"
                  : "border-slate-200 bg-slate-50/80 hover:border-brand-300 hover:bg-white"
              ].join(" ")}
              onClick={() => props.onSelectCriteria(criteria.id)}
              type="button"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-semibold text-slate-900">
                    {criteria.label}
                  </h3>
                  <p className="mt-1 text-sm text-slate-600">{criteria.code}</p>
                  <p className="mt-2 text-sm text-slate-500">
                    {summarizeBiasCriteria(criteria, {
                      locations: props.locations,
                      shiftTypes: props.shiftTypes
                    })}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <span
                    className={[
                      "rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em]",
                      getStatusClasses(criteria.isActive)
                    ].join(" ")}
                  >
                    {criteria.isActive ? "Active" : "Inactive"}
                  </span>
                  {criteria.isWeekendOnly ? (
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-brand-800">
                      Weekend Only
                    </span>
                  ) : null}
                </div>
              </div>
            </button>
          ))}
        </div>
      ) : null}
    </section>
  );
}
