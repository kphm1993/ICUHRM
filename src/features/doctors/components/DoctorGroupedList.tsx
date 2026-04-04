import type { Doctor, DoctorGroup } from "@/domain/models";

interface DoctorGroupedListProps {
  readonly doctors: ReadonlyArray<Doctor>;
  readonly doctorGroups: ReadonlyArray<DoctorGroup>;
  readonly selectedDoctorId: string | null;
  readonly isLoading: boolean;
  readonly onCreateDoctor: () => void;
  readonly onEditSelected: () => void;
  readonly onSelectDoctor: (doctorId: string) => void;
}

function getStatusClasses(isActive: boolean) {
  return isActive
    ? "bg-emerald-100 text-emerald-800"
    : "bg-slate-200 text-slate-700";
}

function DoctorCard(input: {
  readonly doctor: Doctor;
  readonly selectedDoctorId: string | null;
  readonly groupLabel: string;
  readonly onSelectDoctor: (doctorId: string) => void;
}) {
  return (
    <button
      className={[
        "w-full rounded-2xl border px-4 py-4 text-left transition",
        input.selectedDoctorId === input.doctor.id
          ? "border-brand-400 bg-brand-50 shadow-sm"
          : "border-slate-200 bg-slate-50/80 hover:border-brand-300 hover:bg-white"
      ].join(" ")}
      onClick={() => input.onSelectDoctor(input.doctor.id)}
      type="button"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h4 className="text-base font-semibold text-slate-900">
            {input.doctor.name}
          </h4>
          <p className="mt-1 text-sm text-slate-600">
            {input.doctor.uniqueIdentifier} • {input.doctor.phoneNumber}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <span
            className={[
              "rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em]",
              getStatusClasses(input.doctor.isActive)
            ].join(" ")}
          >
            {input.doctor.isActive ? "Active" : "Inactive"}
          </span>
          <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-700">
            {input.groupLabel}
          </span>
        </div>
      </div>
    </button>
  );
}

function renderGroupSection(input: {
  readonly title: string;
  readonly doctors: ReadonlyArray<Doctor>;
  readonly selectedDoctorId: string | null;
  readonly onSelectDoctor: (doctorId: string) => void;
}) {
  return (
    <section className="space-y-3" key={input.title}>
      <header className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-700">
          {input.title}
        </h3>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
          {input.doctors.length}
        </span>
      </header>

      {input.doctors.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 px-4 py-4 text-sm text-slate-500">
          No doctors assigned to this group.
        </div>
      ) : (
        <div className="space-y-3">
          {input.doctors.map((doctor) => (
            <DoctorCard
              doctor={doctor}
              groupLabel={input.title}
              key={doctor.id}
              onSelectDoctor={input.onSelectDoctor}
              selectedDoctorId={input.selectedDoctorId}
            />
          ))}
        </div>
      )}
    </section>
  );
}

export function DoctorGroupedList(props: DoctorGroupedListProps) {
  const orderedGroups = [...props.doctorGroups].sort((left, right) =>
    left.name.localeCompare(right.name)
  );
  const unassignedDoctors = props.doctors.filter((doctor) => !doctor.groupId);

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

        <div className="flex flex-wrap gap-2">
          <button
            className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-brand-300 hover:text-brand-800 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={!props.selectedDoctorId}
            onClick={props.onEditSelected}
            type="button"
          >
            Edit Selected
          </button>
          <button
            className="rounded-full bg-brand-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-800"
            onClick={props.onCreateDoctor}
            type="button"
          >
            Create Doctor
          </button>
        </div>
      </div>

      {props.isLoading ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-600">
          Loading doctors...
        </div>
      ) : null}

      {!props.isLoading && props.doctors.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-brand-300 bg-brand-50/70 px-4 py-5 text-sm text-brand-900">
          No doctors exist yet. Create the first doctor to seed the roster base data.
        </div>
      ) : null}

      {!props.isLoading ? (
        <div className="space-y-5">
          {orderedGroups.map((group) =>
            renderGroupSection({
              title: group.name,
              doctors: props.doctors.filter((doctor) => doctor.groupId === group.id),
              selectedDoctorId: props.selectedDoctorId,
              onSelectDoctor: props.onSelectDoctor
            })
          )}

          <section className="space-y-3">
            <header className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-700">
                Unassigned
              </h3>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                {unassignedDoctors.length}
              </span>
            </header>

            {unassignedDoctors.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 px-4 py-4 text-sm text-slate-500">
                Every doctor is assigned to a group.
              </div>
            ) : (
              <div className="space-y-3">
                {unassignedDoctors.map((doctor) => (
                  <DoctorCard
                    doctor={doctor}
                    groupLabel="Unassigned"
                    key={doctor.id}
                    onSelectDoctor={props.onSelectDoctor}
                    selectedDoctorId={props.selectedDoctorId}
                  />
                ))}
              </div>
            )}
          </section>
        </div>
      ) : null}
    </section>
  );
}
