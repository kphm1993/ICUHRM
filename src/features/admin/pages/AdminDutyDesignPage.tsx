import { AdminToolsSubnav } from "@/features/admin/components/AdminToolsSubnav";
import { DutyDesignForm } from "@/features/admin/components/DutyDesignForm";
import { DutyDesignList } from "@/features/admin/components/DutyDesignList";
import { useDutyDesignManagement } from "@/features/admin/hooks/useDutyDesignManagement";

export function AdminDutyDesignPage() {
  const dutyDesignManagement = useDutyDesignManagement();

  return (
    <section className="space-y-6">
      <header className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-panel">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-brand-700">
          Admin
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">
          Duty Designs
        </h1>
        <p className="mt-3 max-w-3xl text-sm text-slate-600 sm:text-base">
          Create reusable duty-block patterns with explicit shift type, location,
          follow-up, and holiday design settings without changing live roster logic.
        </p>
      </header>

      <AdminToolsSubnav />

      {dutyDesignManagement.errorMessage ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
          {dutyDesignManagement.errorMessage}
        </div>
      ) : null}

      {dutyDesignManagement.successMessage ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          {dutyDesignManagement.successMessage}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <DutyDesignList
          dutyDesigns={dutyDesignManagement.dutyDesigns}
          expandedDutyDesignId={dutyDesignManagement.expandedDutyDesignId}
          isLoading={dutyDesignManagement.isLoading}
          locations={dutyDesignManagement.locations}
          onCreateDutyDesign={dutyDesignManagement.beginCreateDutyDesign}
          onDutyDesignCardClick={dutyDesignManagement.handleDutyDesignCardClick}
          selectedDutyDesignId={dutyDesignManagement.selectedDutyDesignId}
          shiftTypes={dutyDesignManagement.shiftTypes}
        />

        <DutyDesignForm
          activeAction={dutyDesignManagement.activeAction}
          dutyDesign={dutyDesignManagement.selectedDutyDesign}
          dutyDesigns={dutyDesignManagement.dutyDesigns}
          fieldErrors={dutyDesignManagement.fieldErrors}
          locations={dutyDesignManagement.locations}
          mode={dutyDesignManagement.formMode}
          onAddDutyBlockRow={dutyDesignManagement.addDutyBlockRow}
          onCancel={dutyDesignManagement.cancelEditing}
          onDelete={dutyDesignManagement.deleteDutyDesign}
          onRemoveDutyBlockRow={dutyDesignManagement.removeDutyBlockRow}
          onSetBooleanField={dutyDesignManagement.setBooleanField}
          onSubmit={dutyDesignManagement.saveDutyDesign}
          onTextChange={dutyDesignManagement.updateTextField}
          onToggleStatus={dutyDesignManagement.toggleDutyDesignStatus}
          onUpdateDutyBlockRow={dutyDesignManagement.updateDutyBlockRow}
          shiftTypes={dutyDesignManagement.shiftTypes}
          values={dutyDesignManagement.formValues}
        />
      </div>
    </section>
  );
}
