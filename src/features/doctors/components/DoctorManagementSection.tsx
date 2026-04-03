import { DoctorEditorForm } from "@/features/doctors/components/DoctorEditorForm";
import { DoctorList } from "@/features/doctors/components/DoctorList";
import { useDoctorManagement } from "@/features/doctors/hooks/useDoctorManagement";

type DoctorManagementSectionProps = {
  readonly showHeader?: boolean;
};

export function DoctorManagementSection({
  showHeader = true
}: DoctorManagementSectionProps) {
  const doctorManagement = useDoctorManagement();

  return (
    <section className="space-y-6">
      {showHeader ? (
        <header className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-panel">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-brand-700">
            Admin
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">
            Doctor Management
          </h1>
          <p className="mt-3 max-w-3xl text-sm text-slate-600 sm:text-base">
            Maintain the doctor roster base data, weekend-group assignment, and active
            status without bypassing persistence, audit logging, or historical roster
            safety.
          </p>
        </header>
      ) : null}

      {doctorManagement.errorMessage ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
          {doctorManagement.errorMessage}
        </div>
      ) : null}

      {doctorManagement.successMessage ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          {doctorManagement.successMessage}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <DoctorList
          doctors={doctorManagement.doctors}
          selectedDoctorId={doctorManagement.selectedDoctorId}
          isLoading={doctorManagement.isLoading}
          onCreateDoctor={doctorManagement.beginCreateDoctor}
          onSelectDoctor={doctorManagement.beginEditDoctor}
        />

        <DoctorEditorForm
          mode={doctorManagement.formMode}
          doctor={doctorManagement.selectedDoctor}
          values={doctorManagement.formValues}
          activeAction={doctorManagement.activeAction}
          onChange={doctorManagement.updateFormValue}
          onSubmit={doctorManagement.saveDoctor}
          onCancel={doctorManagement.cancelEditing}
          onDelete={doctorManagement.deleteDoctor}
          onToggleStatus={doctorManagement.toggleDoctorStatus}
        />
      </div>
    </section>
  );
}
