import { useEffect } from "react";
import type { Doctor, DoctorGroup } from "@/domain/models";
import type { DoctorFormValues } from "@/features/doctors/hooks/useDoctorManagement";

interface DoctorEditorDialogProps {
  readonly isOpen: boolean;
  readonly mode: "create" | "edit";
  readonly doctor: Doctor | null;
  readonly doctorGroups: ReadonlyArray<DoctorGroup>;
  readonly values: DoctorFormValues;
  readonly activeAction: "save" | "delete" | "status" | "group" | null;
  readonly onChange: <K extends keyof DoctorFormValues>(
    field: K,
    value: DoctorFormValues[K]
  ) => void;
  readonly onClose: () => void;
  readonly onCreateGroup: () => void;
  readonly onSubmit: () => void;
  readonly onDelete: () => void;
  readonly onToggleStatus: () => void;
}

function getSubmitLabel(mode: "create" | "edit", isSaving: boolean) {
  if (isSaving) {
    return mode === "create" ? "Creating..." : "Saving...";
  }

  return mode === "create" ? "Create Doctor" : "Save Changes";
}

export function DoctorEditorDialog(props: DoctorEditorDialogProps) {
  const selectedDoctor = props.doctor;
  const isEditing = props.mode === "edit" && selectedDoctor !== null;

  useEffect(() => {
    if (!props.isOpen) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && props.activeAction === null) {
        props.onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [props.activeAction, props.isOpen, props.onClose]);

  if (!props.isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 py-6"
      onClick={() => {
        if (props.activeAction === null) {
          props.onClose();
        }
      }}
      role="presentation"
    >
      <section
        aria-modal="true"
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[2rem] border border-slate-200 bg-white p-6 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-brand-700">
              {isEditing ? "Edit Doctor" : "Create Doctor"}
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
              {isEditing ? selectedDoctor.name : "New Doctor Record"}
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Assign doctors to reusable groups, or leave them unassigned when no group
              constraint should apply.
            </p>
          </div>

          <button
            className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 transition hover:border-brand-300 hover:text-brand-800"
            disabled={props.activeAction !== null}
            onClick={props.onClose}
            type="button"
          >
            Close
          </button>
        </div>

        {isEditing ? (
          <div className="mt-4 grid gap-3 rounded-2xl bg-slate-50/80 p-4 text-sm text-slate-700 sm:grid-cols-2">
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
          className="mt-5 space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            props.onSubmit();
          }}
        >
          <label className="block space-y-2">
            <span className="text-sm font-medium text-slate-700">Full name</span>
            <input
              className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:bg-white"
              onChange={(event) => props.onChange("name", event.target.value)}
              type="text"
              value={props.values.name}
            />
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium text-slate-700">Phone number</span>
            <input
              className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:bg-white"
              onChange={(event) => props.onChange("phoneNumber", event.target.value)}
              type="tel"
              value={props.values.phoneNumber}
            />
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium text-slate-700">
              Unique ID / employee ID / login ID
            </span>
            <input
              className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:bg-white"
              onChange={(event) =>
                props.onChange("uniqueIdentifier", event.target.value)
              }
              type="text"
              value={props.values.uniqueIdentifier}
            />
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium text-slate-700">Group</span>
            <select
              className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:bg-white"
              onChange={(event) => props.onChange("groupId", event.target.value)}
              value={props.values.groupId}
            >
              <option value="">Unassigned</option>
              {props.doctorGroups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
            </select>
          </label>

          <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
            <div className="flex flex-wrap items-end gap-3">
              <label className="min-w-[14rem] flex-1 space-y-2">
                <span className="text-sm font-medium text-slate-700">Create new group</span>
                <input
                  className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-brand-500"
                  onChange={(event) => props.onChange("newGroupName", event.target.value)}
                  placeholder="Enter new group name"
                  type="text"
                  value={props.values.newGroupName}
                />
              </label>

              <button
                className="rounded-full border border-brand-300 bg-brand-50 px-4 py-3 text-sm font-semibold text-brand-800 transition hover:bg-brand-100 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={props.activeAction !== null}
                onClick={props.onCreateGroup}
                type="button"
              >
                {props.activeAction === "group" ? "Creating Group..." : "Create Group"}
              </button>
            </div>
          </div>

          <label className="block space-y-2">
            <span className="text-sm font-medium text-slate-700">
              Temporary password placeholder
            </span>
            <input
              className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:bg-white"
              onChange={(event) =>
                props.onChange("temporaryPassword", event.target.value)
              }
              placeholder={
                isEditing
                  ? "Optional placeholder only"
                  : "Required placeholder only"
              }
              type="password"
              value={props.values.temporaryPassword}
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
              onClick={props.onClose}
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
    </div>
  );
}
