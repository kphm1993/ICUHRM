import { DoctorEditorDialog } from "@/features/doctors/components/DoctorEditorDialog";
import { DoctorGroupedList } from "@/features/doctors/components/DoctorGroupedList";
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
            Maintain doctor base data, reusable group assignment, and active status
            without bypassing persistence, audit logging, or historical roster safety.
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

      <DoctorGroupedList
          doctors={doctorManagement.doctors}
          doctorGroups={doctorManagement.doctorGroups}
          selectedDoctorId={doctorManagement.selectedDoctorId}
          isLoading={doctorManagement.isLoading}
          onCreateDoctor={doctorManagement.openCreateDoctor}
          onEditSelected={doctorManagement.openEditDoctor}
          onSelectDoctor={doctorManagement.selectDoctor}
      />

      <DoctorEditorDialog
          isOpen={doctorManagement.isEditorOpen}
          mode={doctorManagement.formMode}
          doctor={doctorManagement.selectedDoctor}
          doctorGroups={doctorManagement.doctorGroups}
          values={doctorManagement.formValues}
          activeAction={doctorManagement.activeAction}
          onChange={doctorManagement.updateFormValue}
          onClose={doctorManagement.closeEditor}
          onCreateGroup={doctorManagement.createGroupFromForm}
          onSubmit={doctorManagement.saveDoctor}
          onDelete={doctorManagement.deleteDoctor}
          onToggleStatus={doctorManagement.toggleDoctorStatus}
        />
    </section>
  );
}
