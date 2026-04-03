import { AdminToolsSubnav } from "@/features/admin/components/AdminToolsSubnav";
import { BiasCriteriaBuilderForm } from "@/features/admin/components/BiasCriteriaBuilderForm";
import { BiasCriteriaList } from "@/features/admin/components/BiasCriteriaList";
import { useBiasCriteriaManagement } from "@/features/admin/hooks/useBiasCriteriaManagement";

export function AdminBiasCriteriaPage() {
  const criteriaManagement = useBiasCriteriaManagement();

  return (
    <section className="space-y-6">
      <header className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-panel">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-brand-700">
          Admin
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">
          Bias Criteria
        </h1>
        <p className="mt-3 max-w-3xl text-sm text-slate-600 sm:text-base">
          Build persisted bias criteria with explicit location, shift type, and
          weekday matching rules. Active criteria now shape future roster generation
          while saved roster snapshots keep their original criteria context.
        </p>
      </header>

      <AdminToolsSubnav />

      {criteriaManagement.errorMessage ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
          {criteriaManagement.errorMessage}
        </div>
      ) : null}

      {criteriaManagement.successMessage ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          {criteriaManagement.successMessage}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <BiasCriteriaList
          criteriaEntries={criteriaManagement.criteriaEntries}
          isLoading={criteriaManagement.isLoading}
          locations={criteriaManagement.locations}
          onCreateCriteria={criteriaManagement.beginCreateCriteria}
          onSelectCriteria={criteriaManagement.beginEditCriteria}
          selectedCriteriaId={criteriaManagement.selectedCriteriaId}
          shiftTypes={criteriaManagement.shiftTypes}
        />

        <BiasCriteriaBuilderForm
          activeAction={criteriaManagement.activeAction}
          criteria={criteriaManagement.selectedCriteria}
          fieldErrors={criteriaManagement.fieldErrors}
          locations={criteriaManagement.locations}
          mode={criteriaManagement.formMode}
          onCancel={criteriaManagement.cancelEditing}
          onDelete={criteriaManagement.deleteCriteria}
          onSetWeekdays={criteriaManagement.setWeekdays}
          onSetWeekendOnly={criteriaManagement.setWeekendOnly}
          onSubmit={criteriaManagement.saveCriteria}
          onTextChange={criteriaManagement.updateTextField}
          onToggleLocation={criteriaManagement.toggleLocation}
          onToggleShiftType={criteriaManagement.toggleShiftType}
          onToggleStatus={criteriaManagement.toggleCriteriaStatus}
          onToggleWeekday={criteriaManagement.toggleWeekday}
          previewText={criteriaManagement.previewText}
          shiftTypes={criteriaManagement.shiftTypes}
          values={criteriaManagement.formValues}
        />
      </div>
    </section>
  );
}
