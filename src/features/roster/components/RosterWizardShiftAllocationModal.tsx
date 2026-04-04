import { useEffect, useState } from "react";
import {
  formatRosterWizardStepFourBiasValue,
  getDefaultRosterWizardStepFourTabId
} from "@/features/roster/lib/rosterWizardStepFour";
import type { RosterWizardStepFourShiftDetails } from "@/features/roster/services/rosterWizardService";

interface RosterWizardShiftAllocationModalProps {
  readonly details: RosterWizardStepFourShiftDetails | null;
  readonly isOpen: boolean;
  readonly isBusy: boolean;
  readonly onClose: () => void;
  readonly onAssignDoctor: (doctorId: string | null) => void | Promise<unknown>;
}

export function RosterWizardShiftAllocationModal(
  props: RosterWizardShiftAllocationModalProps
) {
  const [activeTabId, setActiveTabId] = useState("overall-ranking");
  const [selectedDoctorId, setSelectedDoctorId] = useState<string | null>(null);

  useEffect(() => {
    if (!props.details) {
      return;
    }

    setActiveTabId(
      getDefaultRosterWizardStepFourTabId(
        props.details.tabs,
        props.details.currentAssignmentDoctorId
      )
    );
    setSelectedDoctorId(props.details.currentAssignmentDoctorId ?? null);
  }, [props.details]);

  useEffect(() => {
    if (!props.isOpen) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !props.isBusy) {
        props.onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [props.isBusy, props.isOpen, props.onClose]);

  if (!props.isOpen) {
    return null;
  }

  if (!props.details) {
    return (
      <div className="fixed inset-0 z-[60] bg-slate-950/55 p-4" role="presentation">
        <section
          aria-modal="true"
          className="mx-auto flex h-[calc(100vh-2rem)] max-w-3xl flex-col overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-2xl"
          role="dialog"
        >
          <header className="border-b border-slate-200 px-6 py-5">
            <h3 className="text-xl font-semibold text-slate-900">Loading shift details...</h3>
          </header>
          <div className="flex-1 px-6 py-5 text-sm text-slate-600">
            Preparing the live eligibility and bias preview for this shift.
          </div>
        </section>
      </div>
    );
  }

  const activeTab =
    props.details.tabs.find((tab) => tab.id === activeTabId) ?? props.details.tabs[0];

  return (
    <div
      className="fixed inset-0 z-[60] bg-slate-950/55 p-4"
      onClick={() => {
        if (!props.isBusy) {
          props.onClose();
        }
      }}
      role="presentation"
    >
      <section
        aria-modal="true"
        className="mx-auto flex h-[calc(100vh-2rem)] max-w-6xl flex-col overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
      >
        <header className="border-b border-slate-200 px-6 py-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-2">
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-brand-700">
                Shift Allocation
              </p>
              <h3 className="text-2xl font-semibold tracking-tight text-slate-900">
                {props.details.shift.shiftTypeLabel}
                {props.details.shift.slotLabel
                  ? ` • ${props.details.shift.slotLabel}`
                  : ""}
              </h3>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-600">
                <p>{props.details.shift.date}</p>
                <p>{props.details.shift.locationLabel}</p>
                <p>
                  Current assignment:{" "}
                  <span className="font-semibold text-slate-900">
                    {props.details.shift.assignedDoctorName ?? "Unassigned"}
                  </span>
                </p>
              </div>
            </div>

            <button
              className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-brand-300 hover:text-brand-800 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={props.isBusy}
              onClick={props.onClose}
              type="button"
            >
              Close
            </button>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-auto px-6 py-5">
          <div className="space-y-4">
            {props.details.overallRecommendedDoctorName ? (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
                Current top-ranked eligible candidate:{" "}
                <span className="font-semibold">
                  {props.details.overallRecommendedDoctorName}
                </span>
              </div>
            ) : null}

            {props.details.currentAssignmentWarning ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                {props.details.currentAssignmentWarning}
              </div>
            ) : null}

            {props.details.currentAssignmentInvalidReasons.length > 0 ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
                {props.details.currentAssignmentInvalidReasons.join(" ")}
              </div>
            ) : null}

            <div className="grid min-h-0 gap-5 lg:grid-cols-[16rem_1fr]">
              <div
                aria-label="Bias criteria tabs"
                className="space-y-2"
                role="tablist"
              >
                {props.details.tabs.map((tab) => {
                  const isCurrent = tab.id === activeTab.id;

                  return (
                    <button
                      aria-selected={isCurrent}
                      className={[
                        "w-full rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition",
                        isCurrent
                          ? "border-brand-300 bg-brand-50 text-brand-950"
                          : "border-slate-200 bg-white text-slate-700 hover:border-brand-200 hover:bg-brand-50/40"
                      ].join(" ")}
                      key={tab.id}
                      onClick={() => setActiveTabId(tab.id)}
                      role="tab"
                      type="button"
                    >
                      <span className="block">{tab.label}</span>
                      <span className="mt-1 block text-xs font-medium text-slate-500">
                        {tab.doctors.filter((doctor) => doctor.isEligible).length} eligible
                      </span>
                    </button>
                  );
                })}
              </div>

              <section
                className="space-y-4 rounded-3xl border border-slate-200 bg-slate-50/70 p-4"
                role="tabpanel"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h4 className="text-base font-semibold text-slate-900">
                      {activeTab.label}
                    </h4>
                    <p className="mt-1 text-sm text-slate-500">
                      Eligible doctors stay at the top. Ineligible doctors remain
                      visible with the blocking reasons.
                    </p>
                  </div>

                  <div className="text-sm text-slate-600">
                    Selected:{" "}
                    <span className="font-semibold text-slate-900">
                      {activeTab.doctors.find((doctor) => doctor.doctorId === selectedDoctorId)
                        ?.doctorName ?? "None"}
                    </span>
                  </div>
                </div>

                <div className="space-y-3">
                  {activeTab.doctors.map((doctor) => {
                    const isSelected = selectedDoctorId === doctor.doctorId;

                    return (
                      <button
                        className={[
                          "w-full rounded-2xl border px-4 py-3 text-left transition",
                          doctor.isEligible
                            ? isSelected
                              ? "border-brand-400 bg-brand-50"
                              : "border-slate-200 bg-white hover:border-brand-300 hover:bg-brand-50/40"
                            : "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-500"
                        ].join(" ")}
                        disabled={!doctor.isEligible || props.isBusy}
                        key={doctor.doctorId}
                        onClick={() => setSelectedDoctorId(doctor.doctorId)}
                        type="button"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-sm font-semibold text-slate-900">
                                {doctor.doctorName}
                              </span>
                              <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-semibold uppercase tracking-[0.12em] text-slate-700">
                                {doctor.doctorUniqueIdentifier}
                              </span>
                              {doctor.isOverallRecommended ? (
                                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold uppercase tracking-[0.12em] text-emerald-900">
                                  Recommended
                                </span>
                              ) : null}
                              {doctor.isAssigned ? (
                                <span className="rounded-full bg-brand-100 px-2 py-0.5 text-xs font-semibold uppercase tracking-[0.12em] text-brand-900">
                                  Assigned
                                </span>
                              ) : null}
                            </div>

                            {doctor.reasons.length > 0 ? (
                              <p className="text-sm text-rose-800">
                                {doctor.reasons.join(" ")}
                              </p>
                            ) : (
                              <p className="text-sm text-slate-500">
                                Bias {formatRosterWizardStepFourBiasValue(doctor.biasValue)}
                                {doctor.overallScore !== undefined
                                  ? ` • Score ${Math.round(doctor.overallScore * 100) / 100}`
                                  : ""}
                              </p>
                            )}
                          </div>

                          <div className="text-sm font-semibold text-slate-700">
                            Bias {formatRosterWizardStepFourBiasValue(doctor.biasValue)}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>
            </div>
          </div>
        </div>

        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-6 py-4">
          <button
            className="rounded-full border border-rose-300 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-800 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={props.isBusy || props.details.currentAssignmentDoctorId === undefined}
            onClick={() => void props.onAssignDoctor(null)}
            type="button"
          >
            {props.isBusy ? "Saving..." : "Clear Assignment"}
          </button>

          <div className="flex flex-wrap gap-3">
            <button
              className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-brand-300 hover:text-brand-800 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={props.isBusy}
              onClick={props.onClose}
              type="button"
            >
              Cancel
            </button>
            <button
              className="rounded-full bg-brand-700 px-5 py-2 text-sm font-semibold text-white transition hover:bg-brand-800 disabled:cursor-not-allowed disabled:bg-brand-400"
              disabled={props.isBusy || selectedDoctorId === null}
              onClick={() => void props.onAssignDoctor(selectedDoctorId)}
              type="button"
            >
              {props.isBusy ? "Saving..." : "Assign Doctor"}
            </button>
          </div>
        </footer>
      </section>
    </div>
  );
}
