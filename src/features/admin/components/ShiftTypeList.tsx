import type { ShiftType } from "@/domain/models";

interface ShiftTypeListProps {
  readonly shiftTypes: ReadonlyArray<ShiftType>;
  readonly selectedShiftTypeId: string | null;
  readonly expandedShiftTypeId: string | null;
  readonly isLoading: boolean;
  readonly onCreateShiftType: () => void;
  readonly onShiftTypeCardClick: (shiftTypeId: string) => void;
}

function getStatusClasses(isActive: boolean) {
  return isActive
    ? "bg-emerald-100 text-emerald-800"
    : "bg-slate-200 text-slate-700";
}

export function ShiftTypeList(props: ShiftTypeListProps) {
  return (
    <section className="space-y-4 rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-panel">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-brand-700">
            Shift Types
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
            Shift Definitions
          </h2>
        </div>

        <button
          className="rounded-full bg-brand-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-800"
          onClick={props.onCreateShiftType}
          type="button"
        >
          Add Shift Type
        </button>
      </div>

      {props.isLoading ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-600">
          Loading shift types...
        </div>
      ) : null}

      {!props.isLoading && props.shiftTypes.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-brand-300 bg-brand-50/70 px-4 py-5 text-sm text-brand-900">
          No shift types exist yet. Add the first shift type to support scheduling
          configuration and duty designs.
        </div>
      ) : null}

      {!props.isLoading ? (
        <div className="space-y-3">
          {props.shiftTypes.map((shiftType) => {
            const isSelected = props.selectedShiftTypeId === shiftType.id;
            const isExpanded = props.expandedShiftTypeId === shiftType.id;
            const panelId = `shift-type-panel-${shiftType.id}`;

            return (
              <article
                className={[
                  "overflow-hidden rounded-2xl border transition",
                  isSelected || isExpanded
                    ? "border-brand-400 bg-brand-50 shadow-sm"
                    : "border-slate-200 bg-slate-50/80"
                ].join(" ")}
                key={shiftType.id}
              >
                <button
                  aria-controls={panelId}
                  aria-expanded={isExpanded}
                  className={[
                    "w-full px-4 py-4 text-left transition",
                    isExpanded ? "bg-brand-50/70" : "hover:bg-white"
                  ].join(" ")}
                  onClick={() => props.onShiftTypeCardClick(shiftType.id)}
                  type="button"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <h3 className="text-base font-semibold text-slate-900">
                        {shiftType.label}
                      </h3>
                      <p className="mt-1 text-sm text-slate-600">
                        {shiftType.code} • {shiftType.startTime} - {shiftType.endTime}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex flex-wrap justify-end gap-2">
                        <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-brand-800">
                          {shiftType.category}
                        </span>
                        <span
                          className={[
                            "rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em]",
                            getStatusClasses(shiftType.isActive)
                          ].join(" ")}
                        >
                          {shiftType.isActive ? "Active" : "Inactive"}
                        </span>
                      </div>

                      <span
                        aria-hidden="true"
                        className={[
                          "inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition",
                          isExpanded ? "rotate-180" : ""
                        ].join(" ")}
                      >
                        <svg
                          className="h-4 w-4"
                          fill="none"
                          viewBox="0 0 16 16"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            d="M4 6.5L8 10.5L12 6.5"
                            stroke="currentColor"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="1.5"
                          />
                        </svg>
                      </span>
                    </div>
                  </div>
                </button>

                {isExpanded ? (
                  <div
                    className="border-t border-slate-200 bg-slate-50/60 p-4"
                    id={panelId}
                  >
                    <div className="grid gap-3 text-sm text-slate-700 sm:grid-cols-2">
                      <div>
                        <span className="font-semibold text-slate-900">Shift ID:</span>{" "}
                        {shiftType.id}
                      </div>
                      <div>
                        <span className="font-semibold text-slate-900">Category:</span>{" "}
                        {shiftType.category}
                      </div>
                      <div>
                        <span className="font-semibold text-slate-900">Start:</span>{" "}
                        {shiftType.startTime}
                      </div>
                      <div>
                        <span className="font-semibold text-slate-900">End:</span>{" "}
                        {shiftType.endTime}
                      </div>
                    </div>
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}
