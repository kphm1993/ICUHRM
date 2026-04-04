import type {
  DutyDesign,
  DutyLocation,
  ShiftType
} from "@/domain/models";
import type {
  DutyDesignBlockFormValue,
  DutyDesignFormFieldErrors,
  DutyDesignFormValues
} from "@/features/admin/hooks/useDutyDesignManagement";

interface DutyDesignFormProps {
  readonly mode: "create" | "edit";
  readonly dutyDesign: DutyDesign | null;
  readonly dutyDesigns: ReadonlyArray<DutyDesign>;
  readonly values: DutyDesignFormValues;
  readonly fieldErrors: DutyDesignFormFieldErrors;
  readonly shiftTypes: ReadonlyArray<ShiftType>;
  readonly locations: ReadonlyArray<DutyLocation>;
  readonly activeAction: "save" | "delete" | "status" | null;
  readonly onTextChange: (
    field: "code" | "label" | "description",
    value: string
  ) => void;
  readonly onSetBooleanField: (
    field: "isHolidayDesign" | "isActive",
    value: boolean
  ) => void;
  readonly onAddDutyBlockRow: () => void;
  readonly onRemoveDutyBlockRow: (rowId: string) => void;
  readonly onUpdateDutyBlockRow: (
    rowId: string,
    field: Exclude<keyof DutyDesignBlockFormValue, "rowId">,
    value: string
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

  return mode === "create" ? "Create Duty Design" : "Save Changes";
}

function getInputClasses(hasError: boolean) {
  return [
    "w-full rounded-2xl border bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:bg-white",
    hasError
      ? "border-rose-400 focus:border-rose-500"
      : "border-slate-300 focus:border-brand-500"
  ].join(" ");
}

function formatShiftTypeOptionLabel(shiftType: ShiftType): string {
  return shiftType.isActive ? shiftType.code : `${shiftType.code} (Inactive)`;
}

function formatLocationOptionLabel(location: DutyLocation): string {
  return location.isActive ? location.code : `${location.code} (Inactive)`;
}

function formatDutyDesignOptionLabel(dutyDesign: DutyDesign): string {
  return dutyDesign.isActive ? dutyDesign.label : `${dutyDesign.label} (Inactive)`;
}

export function DutyDesignForm(props: DutyDesignFormProps) {
  const selectedDutyDesign = props.dutyDesign;
  const isEditing = props.mode === "edit" && selectedDutyDesign !== null;
  const followUpOptions = props.dutyDesigns.filter(
    (dutyDesign) => dutyDesign.id !== selectedDutyDesign?.id
  );

  return (
    <section className="space-y-4 rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-panel">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-brand-700">
          {isEditing ? "Edit Duty Design" : "Add Duty Design"}
        </p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
          {isEditing ? selectedDutyDesign.label : "New Duty Design"}
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          Duty designs are reusable duty-block templates. They stay separate from
          scheduler execution in this phase, but the validation and audit rules are
          already production-grade.
        </p>
      </div>

      {isEditing ? (
        <div className="grid gap-3 rounded-2xl bg-slate-50/80 p-4 text-sm text-slate-700 sm:grid-cols-2">
          <div>
            <span className="font-semibold text-slate-900">Design ID:</span>{" "}
            {selectedDutyDesign.id}
          </div>
          <div>
            <span className="font-semibold text-slate-900">Current status:</span>{" "}
            {selectedDutyDesign.isActive ? "Active" : "Inactive"}
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

        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-700">Description</span>
          <textarea
            className={getInputClasses(false)}
            onChange={(event) => props.onTextChange("description", event.target.value)}
            rows={3}
            value={props.values.description}
          />
        </label>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3">
            <input
              checked={props.values.isHolidayDesign}
              className="mt-1 h-4 w-4 rounded border-slate-300 text-brand-700 focus:ring-brand-500"
              onChange={(event) =>
                props.onSetBooleanField("isHolidayDesign", event.target.checked)
              }
              type="checkbox"
            />
            <span>
              <span className="block text-sm font-medium text-slate-800">
                Holiday design
              </span>
              <span className="mt-1 block text-sm text-slate-600">
                Marks this design as a holiday-oriented template for admin assignment.
              </span>
            </span>
          </label>

          <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3">
            <input
              checked={props.values.isActive}
              className="mt-1 h-4 w-4 rounded border-slate-300 text-brand-700 focus:ring-brand-500"
              onChange={(event) =>
                props.onSetBooleanField("isActive", event.target.checked)
              }
              type="checkbox"
            />
            <span>
              <span className="block text-sm font-medium text-slate-800">
                Active duty design
              </span>
              <span className="mt-1 block text-sm text-slate-600">
                Inactive designs stay editable and visible for historical/admin clarity.
              </span>
            </span>
          </label>
        </div>

        <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-700">
                Duty Blocks
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                Each block defines shift type, optional location, doctor count,
                follow-up, and off-offset behavior.
              </p>
            </div>
            <button
              className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-brand-300 hover:text-brand-800"
              onClick={props.onAddDutyBlockRow}
              type="button"
            >
              Add Block
            </button>
          </div>

          {props.fieldErrors.dutyBlocks ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
              {props.fieldErrors.dutyBlocks}
            </div>
          ) : null}

          <div className="space-y-3">
            {props.values.dutyBlocks.map((block, index) => (
              <div
                className="rounded-2xl border border-slate-200 bg-white p-4"
                key={block.rowId}
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-slate-900">
                    Block {index + 1}
                  </p>
                  <button
                    className="rounded-full border border-rose-300 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700 transition hover:border-rose-400 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={props.values.dutyBlocks.length === 1}
                    onClick={() => props.onRemoveDutyBlockRow(block.rowId)}
                    type="button"
                  >
                    Remove
                  </button>
                </div>

                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <label className="block space-y-2">
                    <span className="text-sm font-medium text-slate-700">
                      Shift Type
                    </span>
                    <select
                      className={getInputClasses(false)}
                      onChange={(event) =>
                        props.onUpdateDutyBlockRow(
                          block.rowId,
                          "shiftTypeId",
                          event.target.value
                        )
                      }
                      value={block.shiftTypeId}
                    >
                      <option value="">Select shift type</option>
                      {props.shiftTypes.map((shiftType) => (
                        <option key={shiftType.id} value={shiftType.id}>
                          {formatShiftTypeOptionLabel(shiftType)}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="block space-y-2">
                    <span className="text-sm font-medium text-slate-700">
                      Location
                    </span>
                    <select
                      className={getInputClasses(false)}
                      onChange={(event) =>
                        props.onUpdateDutyBlockRow(
                          block.rowId,
                          "locationId",
                          event.target.value
                        )
                      }
                      value={block.locationId}
                    >
                      <option value="">All locations</option>
                      {props.locations.map((location) => (
                        <option key={location.id} value={location.id}>
                          {formatLocationOptionLabel(location)}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="block space-y-2">
                    <span className="text-sm font-medium text-slate-700">
                      Doctor Count
                    </span>
                    <input
                      className={getInputClasses(false)}
                      min="1"
                      onChange={(event) =>
                        props.onUpdateDutyBlockRow(
                          block.rowId,
                          "doctorCount",
                          event.target.value
                        )
                      }
                      type="number"
                      value={block.doctorCount}
                    />
                  </label>

                  <label className="block space-y-2">
                    <span className="text-sm font-medium text-slate-700">
                      Off Offset Days
                    </span>
                    <input
                      className={getInputClasses(false)}
                      max="7"
                      min="0"
                      onChange={(event) =>
                        props.onUpdateDutyBlockRow(
                          block.rowId,
                          "offOffsetDays",
                          event.target.value
                        )
                      }
                      placeholder="Optional"
                      type="number"
                      value={block.offOffsetDays}
                    />
                  </label>

                  <label className="block space-y-2 sm:col-span-2">
                    <span className="text-sm font-medium text-slate-700">
                      Follow-Up Duty Design
                    </span>
                    <select
                      className={getInputClasses(false)}
                      onChange={(event) =>
                        props.onUpdateDutyBlockRow(
                          block.rowId,
                          "followUpDutyDesignId",
                          event.target.value
                        )
                      }
                      value={block.followUpDutyDesignId}
                    >
                      <option value="">No follow-up design</option>
                      {followUpOptions.map((dutyDesign) => (
                        <option key={dutyDesign.id} value={dutyDesign.id}>
                          {formatDutyDesignOptionLabel(dutyDesign)}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </div>
            ))}
          </div>
        </div>

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
                const nextVerb = selectedDutyDesign.isActive ? "deactivate" : "activate";
                if (
                  window.confirm(
                    `Do you want to ${nextVerb} ${selectedDutyDesign.label}?`
                  )
                ) {
                  props.onToggleStatus();
                }
              }}
              type="button"
            >
              {props.activeAction === "status"
                ? selectedDutyDesign.isActive
                  ? "Deactivating..."
                  : "Activating..."
                : selectedDutyDesign.isActive
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
                    `Delete ${selectedDutyDesign.label}? This only works when no assignments or follow-up references still use the design.`
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
