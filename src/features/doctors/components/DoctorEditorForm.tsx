import type { Doctor } from "@/domain/models";
import type { DoctorFormValues } from "@/features/doctors/hooks/useDoctorManagement";

interface DoctorEditorFormProps {
  readonly mode: "create" | "edit";
  readonly doctor: Doctor | null;
  readonly values: DoctorFormValues;
  readonly activeAction: "save" | "delete" | "status" | null;
  readonly onChange: <K extends keyof DoctorFormValues>(
    field: K,
    value: DoctorFormValues[K]
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

  return mode === "create" ? "Create Doctor" : "Save Changes";
}

export function DoctorEditorForm(props: DoctorEditorFormProps) {
  const selectedDoctor = props.doctor;
  const isEditing = props.mode === "edit" && selectedDoctor !== null;

  return (
    <section className="space-y-4 rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-panel">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-brand-700">
          {isEditing ? "Edit Doctor" : "Add Doctor"}
        </p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
          {isEditing ? selectedDoctor.name : "New Doctor Record"}
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          Password entry is a placeholder only in V1. It is not currently wired to
          real authentication.
        </p>
      </div>

      {isEditing ? (
        <div className="grid gap-3 rounded-2xl bg-slate-50/80 p-4 text-sm text-slate-700 sm:grid-cols-2">
          <div>
            <span className="font-semibold text-slate-900">Doctor ID:</span>{" "}
            {selectedDoctor.id}
          </div>
          <div>
            <span className="font-semibold text-slate-900">Current status:</span>{" "}
            {selectedDoctor.isActive ? "Active" : "Inactive"}
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
        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-700">Full name</span>
          <input
            className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:bg-white"
            value={props.values.name}
            onChange={(event) => props.onChange("name", event.target.value)}
            type="text"
          />
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-700">Phone number</span>
          <input
            className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:bg-white"
            value={props.values.phoneNumber}
            onChange={(event) => props.onChange("phoneNumber", event.target.value)}
            type="tel"
          />
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-700">
            Unique ID / employee ID / login ID
          </span>
          <input
            className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:bg-white"
            value={props.values.uniqueIdentifier}
            onChange={(event) =>
              props.onChange("uniqueIdentifier", event.target.value)
            }
            type="text"
          />
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-700">Weekend group</span>
          <select
            className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:bg-white"
            value={props.values.weekendGroup}
            onChange={(event) =>
              props.onChange("weekendGroup", event.target.value as "A" | "B")
            }
          >
            <option value="A">Group A</option>
            <option value="B">Group B</option>
          </select>
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-700">
            Temporary password placeholder
          </span>
          <input
            className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:bg-white"
            value={props.values.temporaryPassword}
            onChange={(event) =>
              props.onChange("temporaryPassword", event.target.value)
            }
            placeholder={
              isEditing
                ? "Optional placeholder only"
                : "Required placeholder only"
            }
            type="password"
          />
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
                const nextVerb = selectedDoctor.isActive ? "deactivate" : "activate";
                if (
                  window.confirm(
                    `Do you want to ${nextVerb} ${selectedDoctor.name}?`
                  )
                ) {
                  props.onToggleStatus();
                }
              }}
              type="button"
            >
              {props.activeAction === "status"
                ? selectedDoctor.isActive
                  ? "Deactivating..."
                  : "Activating..."
                : selectedDoctor.isActive
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
                    `Delete ${selectedDoctor.name}? This only works when no roster, leave, request, or bias records reference the doctor.`
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
