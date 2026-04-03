import type { BiasCriteria, DutyLocation, ShiftType } from "@/domain/models";
import type { DoctorBiasSummary } from "@/features/admin/services/biasCriteriaManagementService";
import { summarizeBiasCriteria } from "@/features/admin/services/biasCriteriaPreview";

interface BiasCriteriaListProps {
  readonly criteriaEntries: ReadonlyArray<BiasCriteria>;
  readonly locations: ReadonlyArray<DutyLocation>;
  readonly shiftTypes: ReadonlyArray<ShiftType>;
  readonly selectedCriteriaId: string | null;
  readonly expandedCriteriaId: string | null;
  readonly doctorBiasListsByCriteriaId: Readonly<
    Record<string, ReadonlyArray<DoctorBiasSummary>>
  >;
  readonly loadingDoctorBiasCriteriaIds: ReadonlySet<string>;
  readonly doctorBiasListErrors: Readonly<Record<string, string>>;
  readonly isLoading: boolean;
  readonly onCreateCriteria: () => void;
  readonly onCriteriaCardClick: (criteriaId: string) => void;
  readonly onRetryDoctorBiasList: (criteriaId: string) => void;
}

function getStatusClasses(isActive: boolean) {
  return isActive
    ? "bg-emerald-100 text-emerald-800"
    : "bg-slate-200 text-slate-700";
}

function getBiasPillClasses(biasValue: number) {
  if (biasValue < 0) {
    return "bg-emerald-100 text-emerald-800";
  }

  if (biasValue > 0) {
    return "bg-rose-100 text-rose-800";
  }

  return "bg-slate-100 text-slate-700";
}

function formatBiasValue(biasValue: number) {
  return `${biasValue > 0 ? "+" : ""}${biasValue}`;
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
          {props.criteriaEntries.map((criteria) => {
            const isSelected = props.selectedCriteriaId === criteria.id;
            const isExpanded = props.expandedCriteriaId === criteria.id;
            const doctorBiasList =
              props.doctorBiasListsByCriteriaId[criteria.id] ?? [];
            const isLoadingBiasList = props.loadingDoctorBiasCriteriaIds.has(criteria.id);
            const biasListError = props.doctorBiasListErrors[criteria.id];
            const panelId = `bias-criteria-panel-${criteria.id}`;

            return (
              <article
                key={criteria.id}
                className={[
                  "overflow-hidden rounded-2xl border transition",
                  isSelected || isExpanded
                    ? "border-brand-400 bg-brand-50 shadow-sm"
                    : "border-slate-200 bg-slate-50/80"
                ].join(" ")}
              >
                <button
                  aria-controls={panelId}
                  aria-expanded={isExpanded}
                  className={[
                    "w-full px-4 py-4 text-left transition",
                    isExpanded ? "bg-brand-50/70" : "hover:bg-white"
                  ].join(" ")}
                  onClick={() => props.onCriteriaCardClick(criteria.id)}
                  type="button"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
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

                    <div className="flex items-center gap-3">
                      <div className="flex flex-wrap justify-end gap-2">
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
                        {criteria.isLocked ? (
                          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-amber-900">
                            Locked
                          </span>
                        ) : null}
                      </div>

                      <span
                        aria-hidden="true"
                        className={[
                          "inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition",
                          isExpanded ? "rotate-180" : ""
                        ].join(" ")}
                      >
                        <svg
                          className="h-4 w-4"
                          fill="none"
                          viewBox="0 0 16 16"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            d="M4 6.5L8 10.5L12 6.5"
                            stroke="currentColor"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="1.5"
                          />
                        </svg>
                      </span>
                    </div>
                  </div>
                </button>

                {isExpanded ? (
                  <div
                    className="border-t border-slate-200 bg-slate-50/60 p-4"
                    id={panelId}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h4 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-800">
                          Doctor Bias Rankings
                        </h4>
                        <p className="mt-1 text-xs text-slate-500">
                          Sorted from most negative bias to most positive bias for the
                          current month.
                        </p>
                      </div>
                      <span className="text-xs font-medium text-slate-500">
                        {isLoadingBiasList ? "Loading..." : `${doctorBiasList.length} doctors`}
                      </span>
                    </div>

                    {isLoadingBiasList ? (
                      <div className="mt-4 rounded-2xl border border-slate-200 bg-white px-4 py-5 text-sm text-slate-600">
                        Loading doctor bias data...
                      </div>
                    ) : null}

                    {!isLoadingBiasList && biasListError ? (
                      <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-4 text-sm text-rose-900">
                        <p>{biasListError}</p>
                        <button
                          className="mt-3 rounded-full border border-rose-300 bg-white px-3 py-1.5 text-xs font-semibold text-rose-800 transition hover:border-rose-400 hover:bg-rose-100"
                          onClick={() => props.onRetryDoctorBiasList(criteria.id)}
                          type="button"
                        >
                          Retry
                        </button>
                      </div>
                    ) : null}

                    {!isLoadingBiasList && !biasListError && doctorBiasList.length === 0 ? (
                      <div className="mt-4 rounded-2xl border border-slate-200 bg-white px-4 py-5 text-sm text-slate-500">
                        No bias data available for this criteria.
                      </div>
                    ) : null}

                    {!isLoadingBiasList && !biasListError && doctorBiasList.length > 0 ? (
                      <div className="mt-4 max-h-64 space-y-2 overflow-y-auto pr-1">
                        {doctorBiasList.map((doctor, index) => (
                          <div
                            key={doctor.doctorId}
                            className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-3"
                          >
                            <div className="flex min-w-0 items-center gap-3">
                              <span className="w-7 shrink-0 text-xs font-mono text-slate-500">
                                #{index + 1}
                              </span>
                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-slate-900">
                                  {doctor.doctorName}
                                </p>
                                <p className="text-xs text-slate-500">
                                  {doctor.doctorUniqueId}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              {!doctor.isActive ? (
                                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-600">
                                  Inactive
                                </span>
                              ) : null}
                              <span
                                className={[
                                  "rounded-full px-3 py-1 text-sm font-mono font-semibold",
                                  getBiasPillClasses(doctor.biasValue)
                                ].join(" ")}
                              >
                                {formatBiasValue(doctor.biasValue)}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}
