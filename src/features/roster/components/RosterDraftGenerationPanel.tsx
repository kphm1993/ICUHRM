import type {
  DoctorGroup,
  GeneratedRosterInputSummary,
  ISODateString,
  ShiftType,
  YearMonthString
} from "@/domain/models";
import { RosterGroupConstraintCalendar } from "@/features/roster/components/RosterGroupConstraintCalendar";
import { formatRosterMonth } from "@/features/roster/lib/formatters";

interface RosterDraftGenerationPanelProps {
  readonly selectedMonth: YearMonthString;
  readonly onSelectedMonthChange: (value: YearMonthString) => void;
  readonly notes: string;
  readonly onNotesChange: (value: string) => void;
  readonly sourceSummary: GeneratedRosterInputSummary | null;
  readonly shiftTypes: ReadonlyArray<ShiftType>;
  readonly doctorGroups: ReadonlyArray<DoctorGroup>;
  readonly allowedDoctorGroupIdByDate: Readonly<Record<ISODateString, string>>;
  readonly selectedConstraintDates: ReadonlyArray<ISODateString>;
  readonly selectedConstraintGroupId: string;
  readonly onToggleConstraintDate: (date: ISODateString) => void;
  readonly onClearSelectedConstraintDates: () => void;
  readonly onSelectedConstraintGroupIdChange: (groupId: string) => void;
  readonly onApplySelectedGroupConstraint: () => void;
  readonly onClearDateConstraint: (date: ISODateString) => void;
  readonly isGenerating: boolean;
  readonly onGenerate: () => void | Promise<unknown>;
  readonly canGenerate: boolean;
}

export function RosterDraftGenerationPanel(
  props: RosterDraftGenerationPanelProps
) {
  return (
    <section className="space-y-4 rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-panel">
      <header className="space-y-2">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-brand-700">
          Admin Generation
        </p>
        <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
          Generate Draft Roster
        </h2>
        <p className="text-sm text-slate-600">
          The page loads active doctors, leaves, off requests, shift definitions, and
          current bias ledgers from services. Group constraints are applied per date
          before the draft is generated.
        </p>
      </header>

      <div className="grid gap-4">
        <label className="space-y-2">
          <span className="text-sm font-medium text-slate-700">Target month</span>
          <input
            className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:bg-white"
            onChange={(event) =>
              props.onSelectedMonthChange(event.target.value as YearMonthString)
            }
            type="month"
            value={props.selectedMonth}
          />
        </label>
      </div>

      <label className="block space-y-2">
        <span className="text-sm font-medium text-slate-700">Admin notes</span>
        <textarea
          className="min-h-[96px] w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:bg-white"
          onChange={(event) => props.onNotesChange(event.target.value)}
          placeholder="Optional notes for this draft generation."
          value={props.notes}
        />
      </label>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <div className="rounded-2xl bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Month
          </p>
          <p className="mt-2 text-base font-semibold text-slate-900">
            {formatRosterMonth(props.selectedMonth)}
          </p>
        </div>
        <div className="rounded-2xl bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Active Doctors
          </p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">
            {props.sourceSummary?.activeDoctorCount ?? "—"}
          </p>
        </div>
        <div className="rounded-2xl bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Leaves In Range
          </p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">
            {props.sourceSummary?.leaveCount ?? "—"}
          </p>
        </div>
        <div className="rounded-2xl bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Off Requests
          </p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">
            {props.sourceSummary?.offRequestCount ?? "—"}
          </p>
        </div>
        <div className="rounded-2xl bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Active Shift Types
          </p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">
            {props.sourceSummary?.shiftTypeCount ?? "—"}
          </p>
        </div>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
        <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-700">
          Shift Definitions
        </h3>
        <div className="mt-3 flex flex-wrap gap-2">
          {props.shiftTypes.map((shiftType) => (
            <span
              className="rounded-full border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
              key={shiftType.id}
            >
              {shiftType.label} ({shiftType.startTime} - {shiftType.endTime})
            </span>
          ))}
        </div>
      </section>

      <RosterGroupConstraintCalendar
        month={props.selectedMonth}
        doctorGroups={props.doctorGroups}
        allowedDoctorGroupIdByDate={props.allowedDoctorGroupIdByDate}
        selectedDates={props.selectedConstraintDates}
        selectedGroupId={props.selectedConstraintGroupId}
        onToggleDate={props.onToggleConstraintDate}
        onClearSelectedDates={props.onClearSelectedConstraintDates}
        onSelectedGroupIdChange={props.onSelectedConstraintGroupIdChange}
        onApplySelectedDates={props.onApplySelectedGroupConstraint}
        onClearDateConstraint={props.onClearDateConstraint}
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-600">
          Generation creates a persisted draft snapshot. It does not publish or lock the
          roster automatically.
        </p>
        <button
          className="rounded-full bg-brand-700 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-800 disabled:cursor-not-allowed disabled:bg-slate-300"
          disabled={!props.canGenerate || props.isGenerating}
          onClick={() => void props.onGenerate()}
          type="button"
        >
          {props.isGenerating ? "Generating draft..." : "Generate Draft"}
        </button>
      </div>
    </section>
  );
}
