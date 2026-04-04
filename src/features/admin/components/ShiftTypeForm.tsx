import type { ShiftKind, ShiftType } from "@/domain/models";
import type {
  ShiftTypeFormFieldErrors,
  ShiftTypeFormValues
} from "@/features/admin/hooks/useShiftTypeManagement";

interface ShiftTypeFormProps {
  readonly mode: "create" | "edit";
  readonly shiftType: ShiftType | null;
  readonly values: ShiftTypeFormValues;
  readonly fieldErrors: ShiftTypeFormFieldErrors;
  readonly activeAction: "save" | "delete" | "status" | null;
  readonly onTextChange: (
    field: "code" | "label" | "startTime" | "endTime",
    value: string
  ) => void;
  readonly onSetCategory: (category: ShiftKind) => void;
  readonly onSetIsActive: (isActive: boolean) => void;
  readonly onSubmit: () => void;
  readonly onCancel: () => void;
  readonly onDelete: () => void;
  readonly onToggleStatus: () => void;
}

const SHIFT_TYPE_CATEGORIES: ReadonlyArray<ShiftKind> = ["DAY", "NIGHT", "CUSTOM"];

function getSubmitLabel(mode: "create" | "edit", isSaving: boolean) {
  if (isSaving) {
    return mode === "create" ? "Creating..." : "Saving...";
  }

  return mode === "create" ? "Create Shift Type" : "Save Changes";
}

function getInputClasses(hasError: boolean) {
  return [
    "w-full rounded-2xl border bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:bg-white",
    hasError
      ? "border-rose-400 focus:border-rose-500"
      : "border-slate-300 focus:border-brand-500"
  ].join(" ");
}

function getCategoryButtonClasses(isSelected: boolean) {
  return [
    "rounded-full border px-3 py-2 text-sm font-medium transition",
    isSelected
      ? "border-brand-400 bg-brand-50 text-brand-900"
      : "border-slate-300 bg-white text-slate-700 hover:border-brand-300 hover:text-brand-800"
  ].join(" ");
}

export function ShiftTypeForm(props: ShiftTypeFormProps) {
  const selectedShiftType = props.shiftType;
  const isEditing = props.mode === "edit" && selectedShiftType !== null;

  return (
    <section className="space-y-4 rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-panel">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-brand-700">
          {isEditing ? "Edit Shift Type" : "Add Shift Type"}
        </p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
          {isEditing ? selectedShiftType.label : "New Shift Type"}
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          Shift types define the reusable day, night, and custom time ranges that
          roster generation and duty designs can reference safely.
        </p>
      </div>

      {isEditing ? (
        <div className="grid gap-3 rounded-2xl bg-slate-50/80 p-4 text-sm text-slate-700 sm:grid-cols-2">
          <div>
            <span className="font-semibold text-slate-900">Shift type ID:</span>{" "}
            {selectedShiftType.id}
          </div>
          <div>
            <span className="font-semibold text-slate-900">Current status:</span>{" "}
            {selectedShiftType.isActive ? "Active" : "Inactive"}
          </div>
        </div>
      ) : null}

      <form
        className="space-y-4"
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
              onChange={(event) => props.onTextChange("label", event.target.value)}
              type="text"
              value={props.values.label}
            />
            {props.fieldErrors.label ? (
              <span className="text-sm text-rose-700">{props.fieldErrors.label}</span>
            ) : null}
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block space-y-2">
            <span className="text-sm font-medium text-slate-700">Start Time</span>
            <input
              className={getInputClasses(Boolean(props.fieldErrors.startTime))}
              onChange={(event) => props.onTextChange("startTime", event.target.value)}
              type="time"
              value={props.values.startTime}
            />
            {props.fieldErrors.startTime ? (
              <span className="text-sm text-rose-700">
                {props.fieldErrors.startTime}
              </span>
            ) : null}
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium text-slate-700">End Time</span>
            <input
              className={getInputClasses(Boolean(props.fieldErrors.endTime))}
              onChange={(event) => props.onTextChange("endTime", event.target.value)}
              type="time"
              value={props.values.endTime}
            />
            {props.fieldErrors.endTime ? (
              <span className="text-sm text-rose-700">{props.fieldErrors.endTime}</span>
            ) : null}
          </label>
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-700">
            Category
          </h3>
          <div className="flex flex-wrap gap-2">
            {SHIFT_TYPE_CATEGORIES.map((category) => (
              <button
                className={getCategoryButtonClasses(props.values.category === category)}
                key={category}
                onClick={() => props.onSetCategory(category)}
                type="button"
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3">
          <input
            checked={props.values.isActive}
            className="mt-1 h-4 w-4 rounded border-slate-300 text-brand-700 focus:ring-brand-500"
            onChange={(event) => props.onSetIsActive(event.target.checked)}
            type="checkbox"
          />
          <span>
            <span className="block text-sm font-medium text-slate-800">
              Active shift type
            </span>
            <span className="mt-1 block text-sm text-slate-600">
              Inactive shift types stay visible in historical and admin editing
              contexts, but should not be used for new configuration unless reactivated.
            </span>
          </span>
        </label>

        <div className="flex flex-wrap gap-3 pt-2">
          <button
            className="rounded-full bg-brand-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-800 disabled:cursor-not-allowed disabled:bg-brand-400"
            disabled={props.activeAction !== null}
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
              className="rounded-full border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-brand-300 hover:text-brand-800 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={props.activeAction !== null}
              onClick={() => {
                const nextVerb = selectedShiftType.isActive ? "deactivate" : "activate";
                if (
                  window.confirm(
                    `Do you want to ${nextVerb} ${selectedShiftType.label}?`
                  )
                ) {
                  props.onToggleStatus();
                }
              }}
              type="button"
            >
              {props.activeAction === "status"
                ? selectedShiftType.isActive
                  ? "Deactivating..."
                  : "Activating..."
                : selectedShiftType.isActive
                  ? "Deactivate"
                  : "Activate"}
            </button>
          ) : null}

          {isEditing ? (
            <button
              className="rounded-full border border-rose-300 bg-rose-50 px-5 py-2.5 text-sm font-semibold text-rose-700 transition hover:border-rose-400 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={props.activeAction !== null}
              onClick={() => {
                if (
                  window.confirm(
                    `Delete ${selectedShiftType.label}? This only works when no duty design, bias criteria, or saved roster snapshot still references the shift type.`
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
