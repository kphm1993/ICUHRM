import type { DoctorGroup } from "@/domain/models";
import { formatRosterDate } from "@/features/roster/lib/formatters";
import type { RosterWizardStepFourDayPreview } from "@/features/roster/services/rosterWizardService";

interface RosterWizardShiftAllocationOverviewProps {
  readonly days: ReadonlyArray<RosterWizardStepFourDayPreview>;
  readonly doctorGroups: ReadonlyArray<DoctorGroup>;
  readonly onJumpToDate: (date: string) => void;
}

export function RosterWizardShiftAllocationOverview(
  props: RosterWizardShiftAllocationOverviewProps
) {
  const doctorGroupsById = new Map(
    props.doctorGroups.map((group) => [group.id, group] as const)
  );

  return (
    <section className="space-y-4 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
      <div>
        <h4 className="text-base font-semibold text-slate-900">Roster Overview</h4>
        <p className="mt-1 text-sm text-slate-500">
          Use the month view for a quick completion scan, then jump directly into
          the daily allocation list.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {props.days.map((day) => {
          const allowedGroupName = day.allowedDoctorGroupId
            ? doctorGroupsById.get(day.allowedDoctorGroupId)?.name ??
              day.allowedDoctorGroupId
            : null;

          return (
            <button
              className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-left transition hover:border-brand-300 hover:bg-brand-50"
              key={day.date}
              onClick={() => props.onJumpToDate(day.date)}
              type="button"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    {formatRosterDate(day.date)}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {day.assignedSlotCount}/{day.totalSlotCount} assigned
                  </p>
                </div>

                <span
                  className={[
                    "rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.12em]",
                    day.invalidSlotCount > 0
                      ? "bg-rose-100 text-rose-900"
                      : day.assignedSlotCount === day.totalSlotCount
                        ? "bg-emerald-100 text-emerald-900"
                        : "bg-amber-100 text-amber-900"
                  ].join(" ")}
                >
                  {day.invalidSlotCount > 0
                    ? "Needs Fix"
                    : day.assignedSlotCount === day.totalSlotCount
                      ? "Complete"
                      : "Open"}
                </span>
              </div>

              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                {day.isHoliday ? (
                  <span className="rounded-full bg-sky-100 px-2 py-1 font-semibold text-sky-900">
                    Holiday
                  </span>
                ) : null}
                {allowedGroupName ? (
                  <span className="rounded-full bg-brand-100 px-2 py-1 font-semibold text-brand-900">
                    {allowedGroupName}
                  </span>
                ) : null}
                {day.excludedDoctorCount > 0 ? (
                  <span className="rounded-full bg-slate-200 px-2 py-1 font-semibold text-slate-800">
                    {day.excludedDoctorCount} excluded
                  </span>
                ) : null}
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
