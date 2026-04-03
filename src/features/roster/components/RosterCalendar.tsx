import { useEffect, useMemo, useState } from "react";
import type { Doctor, EntityId, RosterSnapshot } from "@/domain/models";
import { RosterCalendarView } from "@/features/roster/components/RosterCalendarView";
import { buildRosterCalendarViewModel } from "@/features/roster/selectors/rosterCalendarSelectors";

interface RosterCalendarProps {
  readonly snapshot: RosterSnapshot;
  readonly doctors: ReadonlyArray<Doctor>;
}

export function RosterCalendar(props: RosterCalendarProps) {
  const [selectedDoctorId, setSelectedDoctorId] = useState<EntityId | null>(null);
  const viewModel = useMemo(
    () =>
      buildRosterCalendarViewModel({
        snapshot: props.snapshot,
        doctors: props.doctors,
        selectedDoctorId
      }),
    [props.doctors, props.snapshot, selectedDoctorId]
  );

  useEffect(() => {
    if (!selectedDoctorId) {
      return;
    }

    const isSelectedDoctorVisible = viewModel.doctorOptions.some(
      (option) => option.doctorId === selectedDoctorId
    );

    if (!isSelectedDoctorVisible) {
      setSelectedDoctorId(null);
    }
  }, [selectedDoctorId, viewModel.doctorOptions]);

  return (
    <section className="space-y-4 rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-panel">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-brand-700">
            Calendar Review
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
            Shift Assignments
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">
            Review the month by day and night coverage, then filter by doctor to trace
            assignments across the roster.
          </p>
        </div>

        <label className="space-y-2 lg:min-w-[18rem]">
          <span className="text-sm font-medium text-slate-700">Highlight doctor</span>
          <div className="flex gap-2">
            <select
              className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:bg-white"
              onChange={(event) =>
                setSelectedDoctorId(
                  event.target.value ? (event.target.value as EntityId) : null
                )
              }
              value={selectedDoctorId ?? ""}
            >
              <option value="">(All doctors)</option>
              {viewModel.doctorOptions.map((option) => (
                <option key={option.doctorId} value={option.doctorId}>
                  {option.label}
                </option>
              ))}
            </select>

            <button
              className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:border-brand-400 hover:text-brand-800 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400"
              disabled={!selectedDoctorId}
              onClick={() => setSelectedDoctorId(null)}
              type="button"
            >
              Clear
            </button>
          </div>
        </label>
      </header>

      <RosterCalendarView weeks={viewModel.weeks} />
    </section>
  );
}
