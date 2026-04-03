import { DEFAULT_DUTY_LOCATION_ID, type DutyLocation } from "@/domain/models";
import type {
  DutyLocationFormFieldErrors,
  DutyLocationFormValues
} from "@/features/admin/hooks/useDutyLocationManagement";

interface DutyLocationEditorFormProps {
  readonly mode: "create" | "edit";
  readonly location: DutyLocation | null;
  readonly values: DutyLocationFormValues;
  readonly fieldErrors: DutyLocationFormFieldErrors;
  readonly activeAction: "save" | "delete" | "status" | null;
  readonly onChange: <K extends keyof DutyLocationFormValues>(
    field: K,
    value: DutyLocationFormValues[K]
  ) => void;
  readonly onSubmit: () => void;
  readonly onCancel: () => void;
  readonly onDelete: () => void;
  readonly onToggleStatus: () => void;
}

function getSubmitLabel(mode: "create" | "edit", isSaving: boolean) {
  if (isSaving) {
    return mode === "create" ? "Creating..." : "Saving...";
  }

  return mode === "create" ? "Create Location" : "Save Changes";
}

function getInputClasses(hasError: boolean) {
  return [
    "w-full rounded-2xl border bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:bg-white",
    hasError
      ? "border-rose-400 focus:border-rose-500"
      : "border-slate-300 focus:border-brand-500"
  ].join(" ");
}

export function DutyLocationEditorForm(props: DutyLocationEditorFormProps) {
  const selectedLocation = props.location;
  const isEditing = props.mode === "edit" && selectedLocation !== null;
  const isSystemDefault = selectedLocation?.id === DEFAULT_DUTY_LOCATION_ID;

  return (
    <section className="space-y-4 rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-panel">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-brand-700">
          {isEditing ? "Edit Duty Location" : "Add Duty Location"}
        </p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
          {isEditing ? selectedLocation.label : "New Duty Location"}
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          Duty locations are persisted browser-side in V1 and must remain explicit so
          future criteria and scheduling rules can reference them safely.
        </p>
      </div>

      {isEditing ? (
        <div className="grid gap-3 rounded-2xl bg-slate-50/80 p-4 text-sm text-slate-700 sm:grid-cols-2">
          <div>
            <span className="font-semibold text-slate-900">Location ID:</span>{" "}
            {selectedLocation.id}
          </div>
          <div>
            <span className="font-semibold text-slate-900">Current status:</span>{" "}
            {selectedLocation.isActive ? "Active" : "Inactive"}
          </div>
          {isSystemDefault ? (
            <div className="sm:col-span-2">
              <span className="font-semibold text-slate-900">System rule:</span> The
              default duty location is still required by roster generation and cannot
              be deactivated or deleted in this phase.
            </div>
          ) : null}
        </div>
      ) : null}

      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          props.onSubmit();
        }}
      >
        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-700">Code</span>
          <input
            className={getInputClasses(Boolean(props.fieldErrors.code))}
            onChange={(event) => props.onChange("code", event.target.value)}
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
            onChange={(event) => props.onChange("label", event.target.value)}
            type="text"
            value={props.values.label}
          />
          {props.fieldErrors.label ? (
            <span className="text-sm text-rose-700">{props.fieldErrors.label}</span>
          ) : null}
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-700">Description</span>
          <textarea
            className={getInputClasses(Boolean(props.fieldErrors.description))}
            onChange={(event) => props.onChange("description", event.target.value)}
            rows={4}
            value={props.values.description}
          />
          {props.fieldErrors.description ? (
            <span className="text-sm text-rose-700">
              {props.fieldErrors.description}
            </span>
          ) : null}
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
              disabled={props.activeAction !== null || isSystemDefault}
              onClick={() => {
                const nextVerb = selectedLocation.isActive ? "deactivate" : "activate";
                if (
                  window.confirm(
                    `Do you want to ${nextVerb} ${selectedLocation.label}?`
                  )
                ) {
                  props.onToggleStatus();
                }
              }}
              type="button"
            >
              {props.activeAction === "status"
                ? selectedLocation.isActive
                  ? "Deactivating..."
                  : "Activating..."
                : selectedLocation.isActive
                  ? "Deactivate"
                  : "Activate"}
            </button>
          ) : null}

          {isEditing ? (
            <button
              className="rounded-full border border-rose-300 bg-rose-50 px-5 py-2.5 text-sm font-semibold text-rose-700 transition hover:border-rose-400 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={props.activeAction !== null || isSystemDefault}
              onClick={() => {
                if (
                  window.confirm(
                    `Delete ${selectedLocation.label}? This only works when no saved roster snapshot or bias criteria references the location.`
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
