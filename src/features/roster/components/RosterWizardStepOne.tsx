import type { ISODateString, YearMonthString } from "@/domain/models";
import { RosterWizardHolidayCalendar } from "@/features/roster/components/RosterWizardHolidayCalendar";
import { formatRosterDate, formatRosterMonth } from "@/features/roster/lib/formatters";
import {
  countRosterWizardDaysInRange,
  getRosterWizardStepOneValidationMessage,
  getRosterWizardStepOneViewRange,
  listRosterWizardMonthsInRange,
  type RosterWizardStepOneState
} from "@/features/roster/lib/rosterWizardStepOne";

interface RosterWizardStepOneProps {
  readonly state: RosterWizardStepOneState;
  readonly isDisabled: boolean;
  readonly onRosterMonthChange: (value: YearMonthString) => void;
  readonly onRangeModeChange: (mode: "full-month" | "custom") => void;
  readonly onCustomRangeChange: (
    field: "startDate" | "endDate",
    value: string
  ) => void;
  readonly onToggleHoliday: (date: ISODateString) => void;
  readonly onClearHolidays: () => void;
}

export function RosterWizardStepOne(props: RosterWizardStepOneProps) {
  const viewRange = getRosterWizardStepOneViewRange(props.state);
  const validationMessage = getRosterWizardStepOneValidationMessage(props.state);
  const renderedMonths = listRosterWizardMonthsInRange(viewRange);

  return (
    <section className="space-y-5 rounded-3xl border border-slate-200 bg-slate-50/80 p-5">
      <header className="space-y-2">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-brand-700">
          Step 1
        </p>
        <h3 className="text-2xl font-semibold tracking-tight text-slate-900">
          Period &amp; Holidays
        </h3>
        <p className="text-sm text-slate-600">
          Choose the anchor roster month, optionally widen it into a custom date
          span, then mark public holidays inside the selected range.
        </p>
      </header>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,22rem)_1fr]">
        <div className="space-y-4 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <label className="block space-y-2">
            <span className="text-sm font-medium text-slate-700">
              Anchor roster month
            </span>
            <input
              className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:bg-white disabled:cursor-not-allowed disabled:opacity-70"
              disabled={props.isDisabled}
              onChange={(event) =>
                props.onRosterMonthChange(event.target.value as YearMonthString)
              }
              type="month"
              value={props.state.rosterMonth}
            />
          </label>

          <fieldset className="space-y-3">
            <legend className="text-sm font-medium text-slate-700">Range mode</legend>
            <label className="flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700">
              <input
                checked={!props.state.isCustomRangeEnabled}
                disabled={props.isDisabled}
                name="roster-wizard-range-mode"
                onChange={() => props.onRangeModeChange("full-month")}
                type="radio"
              />
              <span>Full month</span>
            </label>
            <label className="flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700">
              <input
                checked={props.state.isCustomRangeEnabled}
                disabled={props.isDisabled}
                name="roster-wizard-range-mode"
                onChange={() => props.onRangeModeChange("custom")}
                type="radio"
              />
              <span>Custom range</span>
            </label>
          </fieldset>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
            <label className="block space-y-2">
              <span className="text-sm font-medium text-slate-700">
                Custom start date
              </span>
              <input
                className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:bg-white disabled:cursor-not-allowed disabled:opacity-70"
                disabled={props.isDisabled || !props.state.isCustomRangeEnabled}
                onChange={(event) =>
                  props.onCustomRangeChange("startDate", event.target.value)
                }
                type="date"
                value={props.state.customRange.startDate}
              />
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-medium text-slate-700">
                Custom end date
              </span>
              <input
                className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:bg-white disabled:cursor-not-allowed disabled:opacity-70"
                disabled={props.isDisabled || !props.state.isCustomRangeEnabled}
                onChange={(event) =>
                  props.onCustomRangeChange("endDate", event.target.value)
                }
                type="date"
                value={props.state.customRange.endDate}
              />
            </label>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-2">
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Effective Start
              </p>
              <p className="mt-2 text-sm font-semibold text-slate-900">
                {formatRosterDate(viewRange.startDate)}
              </p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Effective End
              </p>
              <p className="mt-2 text-sm font-semibold text-slate-900">
                {formatRosterDate(viewRange.endDate)}
              </p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Days In Range
              </p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">
                {countRosterWizardDaysInRange(viewRange)}
              </p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Public Holidays
              </p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">
                {props.state.publicHolidayDates.length}
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            Anchor month: <span className="font-semibold text-slate-900">{formatRosterMonth(props.state.rosterMonth)}</span>.{" "}
            Custom ranges may span any dates, but they must include at least one date
            from this month.
          </div>

          {validationMessage ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              {validationMessage}
            </div>
          ) : null}
        </div>

        <div className="space-y-4">
          <section className="space-y-3 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h4 className="text-base font-semibold text-slate-900">
                  Selected Public Holidays
                </h4>
                <p className="mt-1 text-sm text-slate-500">
                  Holidays are saved on the draft and carried into later duty-design
                  mapping.
                </p>
              </div>

              <button
                className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-brand-300 hover:text-brand-800 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={props.isDisabled || props.state.publicHolidayDates.length === 0}
                onClick={props.onClearHolidays}
                type="button"
              >
                Clear Holidays
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              {props.state.publicHolidayDates.length === 0 ? (
                <span className="text-sm text-slate-500">No holidays selected.</span>
              ) : (
                props.state.publicHolidayDates.map((date) => (
                  <span
                    className="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-900"
                    key={date}
                  >
                    {formatRosterDate(date)}
                  </span>
                ))
              )}
            </div>
          </section>

          <div className="grid gap-4 2xl:grid-cols-2">
            {renderedMonths.map((month) => (
              <RosterWizardHolidayCalendar
                isDisabled={props.isDisabled}
                key={month}
                month={month}
                onToggleHoliday={props.onToggleHoliday}
                range={viewRange}
                selectedHolidayDates={props.state.publicHolidayDates}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
