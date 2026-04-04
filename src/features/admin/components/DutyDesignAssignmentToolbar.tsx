import type { DutyDesign, ISODateString, YearMonthString } from "@/domain/models";
import { formatRosterDate, formatRosterMonth } from "@/features/roster/lib/formatters";

interface DutyDesignAssignmentToolbarProps {
  readonly month: YearMonthString;
  readonly activeDutyDesignOptions: ReadonlyArray<DutyDesign>;
  readonly selectedDates: ReadonlyArray<ISODateString>;
  readonly selectedDutyDesignId: string;
  readonly isHolidayOverride: boolean;
  readonly activeAction: "assign" | "unassign" | null;
  readonly onSetMonth: (month: YearMonthString) => void;
  readonly onClearSelectedDates: () => void;
  readonly onSetSelectedDutyDesignId: (dutyDesignId: string) => void;
  readonly onSetIsHolidayOverride: (isHolidayOverride: boolean) => void;
  readonly onAssignSelectedDates: () => void;
}

export function DutyDesignAssignmentToolbar(
  props: DutyDesignAssignmentToolbarProps
) {
  return (
    <section className="space-y-4 rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-panel">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-brand-700">
          Assignment Controls
        </p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
          {formatRosterMonth(props.month)}
        </h2>
      </div>

      <label className="block space-y-2">
        <span className="text-sm font-medium text-slate-700">Roster Month</span>
        <input
          className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:bg-white"
          onChange={(event) => props.onSetMonth(event.target.value as YearMonthString)}
          type="month"
          value={props.month}
        />
      </label>

      <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-slate-900">Selected Dates</p>
            <p className="mt-1 text-xs text-slate-500">
              Click calendar days to build a batch assignment.
            </p>
          </div>
          <button
            className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-brand-300 hover:text-brand-800 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={props.selectedDates.length === 0}
            onClick={props.onClearSelectedDates}
            type="button"
          >
            Clear
          </button>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {props.selectedDates.length === 0 ? (
            <span className="text-sm text-slate-500">No dates selected.</span>
          ) : null}
          {props.selectedDates.map((date) => (
            <span
              className="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-900"
              key={date}
            >
              {formatRosterDate(date)}
            </span>
          ))}
        </div>
      </div>

      <label className="block space-y-2">
        <span className="text-sm font-medium text-slate-700">Duty Design</span>
        <select
          className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:bg-white"
          onChange={(event) => props.onSetSelectedDutyDesignId(event.target.value)}
          value={props.selectedDutyDesignId}
        >
          <option value="">Select active duty design</option>
          {props.activeDutyDesignOptions.map((dutyDesign) => (
            <option key={dutyDesign.id} value={dutyDesign.id}>
              {dutyDesign.label} ({dutyDesign.code})
            </option>
          ))}
        </select>
      </label>

      <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3">
        <input
          checked={props.isHolidayOverride}
          className="mt-1 h-4 w-4 rounded border-slate-300 text-brand-700 focus:ring-brand-500"
          onChange={(event) => props.onSetIsHolidayOverride(event.target.checked)}
          type="checkbox"
        />
        <span>
          <span className="block text-sm font-medium text-slate-800">
            Holiday override
          </span>
          <span className="mt-1 block text-sm text-slate-600">
            Applies the holiday flag uniformly to the current batch assignment.
          </span>
        </span>
      </label>

      <button
        className="w-full rounded-full bg-brand-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-800 disabled:cursor-not-allowed disabled:bg-brand-400"
        disabled={props.activeAction !== null}
        onClick={props.onAssignSelectedDates}
        type="button"
      >
        {props.activeAction === "assign" ? "Assigning..." : "Assign Duty Design"}
      </button>
    </section>
  );
}
