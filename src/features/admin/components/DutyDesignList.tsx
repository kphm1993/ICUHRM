import type { DutyDesign, DutyLocation, ShiftType } from "@/domain/models";

interface DutyDesignListProps {
  readonly dutyDesigns: ReadonlyArray<DutyDesign>;
  readonly selectedDutyDesignId: string | null;
  readonly expandedDutyDesignId: string | null;
  readonly isLoading: boolean;
  readonly shiftTypes: ReadonlyArray<ShiftType>;
  readonly locations: ReadonlyArray<DutyLocation>;
  readonly onCreateDutyDesign: () => void;
  readonly onDutyDesignCardClick: (dutyDesignId: string) => void;
}

function getStatusClasses(isActive: boolean) {
  return isActive
    ? "bg-emerald-100 text-emerald-800"
    : "bg-slate-200 text-slate-700";
}

function resolveShiftTypeLabel(
  shiftTypes: ReadonlyArray<ShiftType>,
  shiftTypeId: string
): string {
  const shiftType = shiftTypes.find((entry) => entry.id === shiftTypeId);
  return shiftType ? shiftType.code : shiftTypeId;
}

function resolveLocationLabel(
  locations: ReadonlyArray<DutyLocation>,
  locationId: string | undefined
): string {
  if (!locationId) {
    return "All locations";
  }

  const location = locations.find((entry) => entry.id === locationId);
  return location ? location.code : locationId;
}

export function DutyDesignList(props: DutyDesignListProps) {
  return (
    <section className="space-y-4 rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-panel">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-brand-700">
            Duty Designs
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
            Design Records
          </h2>
        </div>

        <button
          className="rounded-full bg-brand-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-800"
          onClick={props.onCreateDutyDesign}
          type="button"
        >
          Add Duty Design
        </button>
      </div>

      {props.isLoading ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-600">
          Loading duty designs...
        </div>
      ) : null}

      {!props.isLoading && props.dutyDesigns.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-brand-300 bg-brand-50/70 px-4 py-5 text-sm text-brand-900">
          No duty designs exist yet. Add the first design to define reusable
          duty-block patterns.
        </div>
      ) : null}

      {!props.isLoading ? (
        <div className="space-y-3">
          {props.dutyDesigns.map((dutyDesign) => {
            const isSelected = props.selectedDutyDesignId === dutyDesign.id;
            const isExpanded = props.expandedDutyDesignId === dutyDesign.id;
            const panelId = `duty-design-panel-${dutyDesign.id}`;

            return (
              <article
                className={[
                  "overflow-hidden rounded-2xl border transition",
                  isSelected || isExpanded
                    ? "border-brand-400 bg-brand-50 shadow-sm"
                    : "border-slate-200 bg-slate-50/80"
                ].join(" ")}
                key={dutyDesign.id}
              >
                <button
                  aria-controls={panelId}
                  aria-expanded={isExpanded}
                  className={[
                    "w-full px-4 py-4 text-left transition",
                    isExpanded ? "bg-brand-50/70" : "hover:bg-white"
                  ].join(" ")}
                  onClick={() => props.onDutyDesignCardClick(dutyDesign.id)}
                  type="button"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <h3 className="text-base font-semibold text-slate-900">
                        {dutyDesign.label}
                      </h3>
                      <p className="mt-1 text-sm text-slate-600">{dutyDesign.code}</p>
                      {dutyDesign.description ? (
                        <p className="mt-2 text-sm text-slate-500">
                          {dutyDesign.description}
                        </p>
                      ) : null}
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex flex-wrap justify-end gap-2">
                        <span
                          className={[
                            "rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em]",
                            getStatusClasses(dutyDesign.isActive)
                          ].join(" ")}
                        >
                          {dutyDesign.isActive ? "Active" : "Inactive"}
                        </span>
                        {dutyDesign.isHolidayDesign ? (
                          <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-brand-800">
                            Holiday
                          </span>
                        ) : null}
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-700">
                          {dutyDesign.dutyBlocks.length} block
                          {dutyDesign.dutyBlocks.length === 1 ? "" : "s"}
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
                    <div className="space-y-2">
                      {dutyDesign.dutyBlocks.map((block, index) => (
                        <div
                          className="rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-700"
                          key={`${dutyDesign.id}-${index}`}
                        >
                          <p className="font-semibold text-slate-900">
                            Block {index + 1}
                          </p>
                          <p className="mt-1">
                            Shift:{" "}
                            {resolveShiftTypeLabel(props.shiftTypes, block.shiftTypeId)}
                          </p>
                          <p>
                            Location:{" "}
                            {resolveLocationLabel(props.locations, block.locationId)}
                          </p>
                          <p>Doctors: {block.doctorCount}</p>
                          <p>
                            Off Offset:{" "}
                            {block.offOffsetDays === undefined
                              ? "None"
                              : block.offOffsetDays}
                          </p>
                        </div>
                      ))}
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
