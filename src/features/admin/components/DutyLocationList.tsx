import { DEFAULT_DUTY_LOCATION_ID, type DutyLocation } from "@/domain/models";

interface DutyLocationListProps {
  readonly locations: ReadonlyArray<DutyLocation>;
  readonly selectedLocationId: string | null;
  readonly isLoading: boolean;
  readonly onCreateLocation: () => void;
  readonly onSelectLocation: (locationId: string) => void;
}

function getStatusClasses(isActive: boolean) {
  return isActive
    ? "bg-emerald-100 text-emerald-800"
    : "bg-slate-200 text-slate-700";
}

export function DutyLocationList(props: DutyLocationListProps) {
  return (
    <section className="space-y-4 rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-panel">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-brand-700">
            Duty Locations
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
            Location Records
          </h2>
        </div>

        <button
          className="rounded-full bg-brand-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-800"
          onClick={props.onCreateLocation}
          type="button"
        >
          Add Location
        </button>
      </div>

      {props.isLoading ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-600">
          Loading duty locations...
        </div>
      ) : null}

      {!props.isLoading && props.locations.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-brand-300 bg-brand-50/70 px-4 py-5 text-sm text-brand-900">
          No duty locations exist yet. Add the first location to support future
          location-aware criteria.
        </div>
      ) : null}

      {!props.isLoading ? (
        <div className="space-y-3">
          {props.locations.map((location) => (
            <button
              key={location.id}
              className={[
                "w-full rounded-2xl border px-4 py-4 text-left transition",
                props.selectedLocationId === location.id
                  ? "border-brand-400 bg-brand-50 shadow-sm"
                  : "border-slate-200 bg-slate-50/80 hover:border-brand-300 hover:bg-white"
              ].join(" ")}
              onClick={() => props.onSelectLocation(location.id)}
              type="button"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-semibold text-slate-900">
                    {location.label}
                  </h3>
                  <p className="mt-1 text-sm text-slate-600">{location.code}</p>
                  {location.description ? (
                    <p className="mt-2 text-sm text-slate-500">{location.description}</p>
                  ) : null}
                </div>

                <div className="flex flex-wrap gap-2">
                  <span
                    className={[
                      "rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em]",
                      getStatusClasses(location.isActive)
                    ].join(" ")}
                  >
                    {location.isActive ? "Active" : "Inactive"}
                  </span>
                  {location.id === DEFAULT_DUTY_LOCATION_ID ? (
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-brand-800">
                      System Default
                    </span>
                  ) : null}
                </div>
              </div>
            </button>
          ))}
        </div>
      ) : null}
    </section>
  );
}
