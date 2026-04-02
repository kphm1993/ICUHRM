import type { Doctor } from "@/domain/models";

interface DoctorListProps {
  readonly doctors: ReadonlyArray<Doctor>;
  readonly selectedDoctorId: string | null;
  readonly isLoading: boolean;
  readonly onCreateDoctor: () => void;
  readonly onSelectDoctor: (doctorId: string) => void;
}

function getStatusClasses(isActive: boolean) {
  return isActive
    ? "bg-emerald-100 text-emerald-800"
    : "bg-slate-200 text-slate-700";
}

export function DoctorList(props: DoctorListProps) {
  return (
    <section className="space-y-4 rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-panel">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-brand-700">
            Doctors
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
            Roster Base Data
          </h2>
        </div>

        <button
          className="rounded-full bg-brand-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-800"
          onClick={props.onCreateDoctor}
          type="button"
        >
          Add Doctor
        </button>
      </div>

      {props.isLoading ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-600">
          Loading doctors...
        </div>
      ) : null}

      {!props.isLoading && props.doctors.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-brand-300 bg-brand-50/70 px-4 py-5 text-sm text-brand-900">
          No doctors exist yet. Add the first doctor to seed the roster base data.
        </div>
      ) : null}

      {!props.isLoading ? (
        <div className="space-y-3">
          {props.doctors.map((doctor) => (
            <button
              key={doctor.id}
              className={[
                "w-full rounded-2xl border px-4 py-4 text-left transition",
                props.selectedDoctorId === doctor.id
                  ? "border-brand-400 bg-brand-50 shadow-sm"
                  : "border-slate-200 bg-slate-50/80 hover:border-brand-300 hover:bg-white"
              ].join(" ")}
              onClick={() => props.onSelectDoctor(doctor.id)}
              type="button"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-semibold text-slate-900">
                    {doctor.name}
                  </h3>
                  <p className="mt-1 text-sm text-slate-600">
                    {doctor.uniqueIdentifier} • {doctor.phoneNumber}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <span
                    className={[
                      "rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em]",
                      getStatusClasses(doctor.isActive)
                    ].join(" ")}
                  >
                    {doctor.isActive ? "Active" : "Inactive"}
                  </span>
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-700">
                    Weekend {doctor.weekendGroup}
                  </span>
                </div>
              </div>
            </button>
          ))}
        </div>
      ) : null}
    </section>
  );
}
