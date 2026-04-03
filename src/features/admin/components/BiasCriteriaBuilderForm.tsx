import type {
  BiasCriteria,
  DayOfWeek,
  DutyLocation,
  ShiftType
} from "@/domain/models";
import type {
  BiasCriteriaFormFieldErrors,
  BiasCriteriaFormValues
} from "@/features/admin/hooks/useBiasCriteriaManagement";

interface BiasCriteriaBuilderFormProps {
  readonly mode: "create" | "edit";
  readonly criteria: BiasCriteria | null;
  readonly values: BiasCriteriaFormValues;
  readonly fieldErrors: BiasCriteriaFormFieldErrors;
  readonly locations: ReadonlyArray<DutyLocation>;
  readonly shiftTypes: ReadonlyArray<ShiftType>;
  readonly previewText: string;
  readonly activeAction: "save" | "delete" | "status" | "lock" | null;
  readonly onTextChange: (field: "code" | "label", value: string) => void;
  readonly onToggleLocation: (locationId: string) => void;
  readonly onToggleShiftType: (shiftTypeId: string) => void;
  readonly onToggleWeekday: (day: DayOfWeek) => void;
  readonly onSetWeekdays: (days: ReadonlyArray<DayOfWeek>) => void;
  readonly onSetWeekendOnly: (isWeekendOnly: boolean) => void;
  readonly onSubmit: () => void;
  readonly onCancel: () => void;
  readonly onDelete: () => void;
  readonly onToggleStatus: () => void;
  readonly onToggleLock: () => void;
}

const WEEKDAYS_ONLY: ReadonlyArray<DayOfWeek> = ["MON", "TUE", "WED", "THU", "FRI"];
const WEEKENDS_ONLY: ReadonlyArray<DayOfWeek> = ["SAT", "SUN"];
const WEEKDAY_LABELS: ReadonlyArray<{
  readonly day: DayOfWeek;
  readonly label: string;
}> = [
  { day: "MON", label: "Mon" },
  { day: "TUE", label: "Tue" },
  { day: "WED", label: "Wed" },
  { day: "THU", label: "Thu" },
  { day: "FRI", label: "Fri" },
  { day: "SAT", label: "Sat" },
  { day: "SUN", label: "Sun" }
];

function getSubmitLabel(mode: "create" | "edit", isSaving: boolean) {
  if (isSaving) {
    return mode === "create" ? "Creating..." : "Saving...";
  }

  return mode === "create" ? "Create Criteria" : "Save Changes";
}

function getInputClasses(hasError: boolean) {
  return [
    "w-full rounded-2xl border bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:bg-white",
    hasError
      ? "border-rose-400 focus:border-rose-500"
      : "border-slate-300 focus:border-brand-500"
  ].join(" ");
}

function getPillClasses(isSelected: boolean) {
  return [
    "rounded-full border px-3 py-2 text-sm font-medium transition",
    isSelected
      ? "border-brand-400 bg-brand-50 text-brand-900"
      : "border-slate-300 bg-white text-slate-700 hover:border-brand-300 hover:text-brand-800"
  ].join(" ");
}

export function BiasCriteriaBuilderForm(props: BiasCriteriaBuilderFormProps) {
  const selectedCriteria = props.criteria;
  const isEditing = props.mode === "edit" && selectedCriteria !== null;
  const isLocked = selectedCriteria?.isLocked ?? false;
  const areFieldsLocked = isEditing && isLocked;

  return (
    <section className="space-y-4 rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-panel">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-brand-700">
          {isEditing ? "Edit Bias Criteria" : "Add Bias Criteria"}
        </p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
          {isEditing ? selectedCriteria.label : "New Criteria Record"}
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          Criteria records now shape future roster scoring. Editing them affects only
          future generations and never rewrites historical roster snapshots.
        </p>
      </div>

      {isEditing ? (
        <div className="grid gap-3 rounded-2xl bg-slate-50/80 p-4 text-sm text-slate-700 sm:grid-cols-2">
          <div>
            <span className="font-semibold text-slate-900">Criteria ID:</span>{" "}
            {selectedCriteria.id}
          </div>
          <div>
            <span className="font-semibold text-slate-900">Current status:</span>{" "}
            {selectedCriteria.isActive ? "Active" : "Inactive"}
          </div>
          <div>
            <span className="font-semibold text-slate-900">Edit protection:</span>{" "}
            {selectedCriteria.isLocked ? "Locked" : "Unlocked"}
          </div>
          <div>
            <span className="font-semibold text-slate-900">Locked by:</span>{" "}
            {selectedCriteria.lockedByActorId ?? "Not locked"}
          </div>
        </div>
      ) : null}

      {areFieldsLocked ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          This criteria is locked. Unlock it before editing the rule, changing its
          active status, or deleting it.
        </div>
      ) : null}

      <form
        className="space-y-5"
        onSubmit={(event) => {
          event.preventDefault();
          props.onSubmit();
        }}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block space-y-2">
            <span className="text-sm font-medium text-slate-700">Code</span>
            <input
              className={getInputClasses(Boolean(props.fieldErrors.code))}
              disabled={areFieldsLocked}
              onChange={(event) => props.onTextChange("code", event.target.value)}
              type="text"
              value={props.values.code}
            />
            {props.fieldErrors.code ? (
              <span className="text-sm text-rose-700">{props.fieldErrors.code}</span>
            ) : null}
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium text-slate-700">Label</span>
            <input
              className={getInputClasses(Boolean(props.fieldErrors.label))}
              disabled={areFieldsLocked}
              onChange={(event) => props.onTextChange("label", event.target.value)}
              type="text"
              value={props.values.label}
            />
            {props.fieldErrors.label ? (
              <span className="text-sm text-rose-700">{props.fieldErrors.label}</span>
            ) : null}
          </label>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-700">
              Locations
            </h3>
            <span className="text-xs text-slate-500">
              Leave empty to match all locations
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {props.locations.map((location) => (
              <button
                key={location.id}
                className={getPillClasses(
                  props.values.locationIds.includes(location.id)
                )}
                disabled={areFieldsLocked}
                onClick={() => props.onToggleLocation(location.id)}
                type="button"
              >
                {location.code} {location.isActive ? "" : "(Inactive)"}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-700">
              Shift Types
            </h3>
            <span className="text-xs text-slate-500">
              Leave empty to match all shift types
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {props.shiftTypes.map((shiftType) => (
              <button
                key={shiftType.id}
                className={getPillClasses(
                  props.values.shiftTypeIds.includes(shiftType.id)
                )}
                disabled={areFieldsLocked}
                onClick={() => props.onToggleShiftType(shiftType.id)}
                type="button"
              >
                {shiftType.code} {shiftType.isActive ? "" : "(Inactive)"}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-700">
                Weekday Conditions
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                Leave empty to match all days.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-brand-300 hover:text-brand-800"
                disabled={areFieldsLocked}
                onClick={() => props.onSetWeekdays(WEEKDAYS_ONLY)}
                type="button"
              >
                Weekdays
              </button>
              <button
                className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-brand-300 hover:text-brand-800"
                disabled={areFieldsLocked}
                onClick={() => props.onSetWeekdays(WEEKENDS_ONLY)}
                type="button"
              >
                Weekends
              </button>
              <button
                className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-brand-300 hover:text-brand-800"
                disabled={areFieldsLocked}
                onClick={() => props.onSetWeekdays([])}
                type="button"
              >
                All Days
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {WEEKDAY_LABELS.map(({ day, label }) => (
              <button
                key={day}
                className={getPillClasses(
                  props.values.weekdayConditions.includes(day)
                )}
                disabled={areFieldsLocked}
                onClick={() => props.onToggleWeekday(day)}
                type="button"
              >
                {label}
              </button>
            ))}
          </div>

          {props.fieldErrors.weekdayConditions ? (
            <p className="text-sm text-rose-700">
              {props.fieldErrors.weekdayConditions}
            </p>
          ) : null}
        </div>

        <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3">
          <input
            checked={props.values.isWeekendOnly}
            className="mt-1 h-4 w-4 rounded border-slate-300 text-brand-700 focus:ring-brand-500"
            disabled={areFieldsLocked}
            onChange={(event) => props.onSetWeekendOnly(event.target.checked)}
            type="checkbox"
          />
          <span>
            <span className="block text-sm font-medium text-slate-800">
              Weekend-only criteria
            </span>
            <span className="mt-1 block text-sm text-slate-600">
              Use this only when the selected weekday conditions include Saturday
              and/or Sunday.
            </span>
            {props.fieldErrors.isWeekendOnly ? (
              <span className="mt-1 block text-sm text-rose-700">
                {props.fieldErrors.isWeekendOnly}
              </span>
            ) : null}
          </span>
        </label>

        <div className="rounded-2xl border border-brand-200 bg-brand-50/70 px-4 py-4">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-brand-800">
            Live Preview
          </p>
          <p className="mt-2 text-sm text-slate-700">{props.previewText}</p>
        </div>

        <div className="flex flex-wrap gap-3 pt-2">
          <button
            className="rounded-full bg-brand-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-800 disabled:cursor-not-allowed disabled:bg-brand-400"
            disabled={props.activeAction !== null || areFieldsLocked}
            type="submit"
          >
            {getSubmitLabel(props.mode, props.activeAction === "save")}
          </button>

          <button
            className="rounded-full border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-brand-300 hover:text-brand-800 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={props.activeAction !== null}
            onClick={props.onCancel}
            type="button"
          >
            Cancel
          </button>

          {isEditing ? (
            <button
              className={[
                "rounded-full px-5 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60",
                selectedCriteria.isLocked
                  ? "border border-amber-300 bg-amber-50 text-amber-900 hover:border-amber-400 hover:bg-amber-100"
                  : "border border-slate-300 bg-white text-slate-700 hover:border-brand-300 hover:text-brand-800"
              ].join(" ")}
              disabled={props.activeAction !== null}
              onClick={() => {
                const nextVerb = selectedCriteria.isLocked ? "unlock" : "lock";
                if (
                  window.confirm(
                    `Do you want to ${nextVerb} ${selectedCriteria.label}?`
                  )
                ) {
                  props.onToggleLock();
                }
              }}
              type="button"
            >
              {props.activeAction === "lock"
                ? selectedCriteria.isLocked
                  ? "Unlocking..."
                  : "Locking..."
                : selectedCriteria.isLocked
                  ? "Unlock Criteria"
                  : "Lock Criteria"}
            </button>
          ) : null}

          {isEditing ? (
            <button
              className="rounded-full border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-brand-300 hover:text-brand-800 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={props.activeAction !== null || areFieldsLocked}
              onClick={() => {
                const nextVerb = selectedCriteria.isActive ? "deactivate" : "activate";
                if (
                  window.confirm(
                    `Do you want to ${nextVerb} ${selectedCriteria.label}?`
                  )
                ) {
                  props.onToggleStatus();
                }
              }}
              type="button"
            >
              {props.activeAction === "status"
                ? selectedCriteria.isActive
                  ? "Deactivating..."
                  : "Activating..."
                : selectedCriteria.isActive
                  ? "Deactivate"
                  : "Activate"}
            </button>
          ) : null}

          {isEditing ? (
            <button
              className="rounded-full border border-rose-300 bg-rose-50 px-5 py-2.5 text-sm font-semibold text-rose-700 transition hover:border-rose-400 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={props.activeAction !== null || areFieldsLocked}
              onClick={() => {
                if (
                  window.confirm(
                    `Delete ${selectedCriteria.label}? This only works when no current or historical primary bias ledger references the criteria.`
                  )
                ) {
                  props.onDelete();
                }
              }}
              type="button"
            >
              {props.activeAction === "delete" ? "Deleting..." : "Delete"}
            </button>
          ) : null}
        </div>
      </form>
    </section>
  );
}
