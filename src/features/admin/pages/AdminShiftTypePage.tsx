import { AdminToolsSubnav } from "@/features/admin/components/AdminToolsSubnav";
import { ShiftTypeForm } from "@/features/admin/components/ShiftTypeForm";
import { ShiftTypeList } from "@/features/admin/components/ShiftTypeList";
import { useShiftTypeManagement } from "@/features/admin/hooks/useShiftTypeManagement";

export function AdminShiftTypePage() {
  const shiftTypeManagement = useShiftTypeManagement();

  return (
    <section className="space-y-6">
      <header className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-panel">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-brand-700">
          Admin
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">
          Shift Types
        </h1>
        <p className="mt-3 max-w-3xl text-sm text-slate-600 sm:text-base">
          Maintain persisted shift definitions with explicit start and end times,
          active status control, and audit logging for high-impact scheduling changes.
        </p>
      </header>

      <AdminToolsSubnav />

      {shiftTypeManagement.errorMessage ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
          {shiftTypeManagement.errorMessage}
        </div>
      ) : null}

      {shiftTypeManagement.successMessage ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          {shiftTypeManagement.successMessage}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <ShiftTypeList
          expandedShiftTypeId={shiftTypeManagement.expandedShiftTypeId}
          isLoading={shiftTypeManagement.isLoading}
          onCreateShiftType={shiftTypeManagement.beginCreateShiftType}
          onShiftTypeCardClick={shiftTypeManagement.handleShiftTypeCardClick}
          selectedShiftTypeId={shiftTypeManagement.selectedShiftTypeId}
          shiftTypes={shiftTypeManagement.shiftTypes}
        />

        <ShiftTypeForm
          activeAction={shiftTypeManagement.activeAction}
          fieldErrors={shiftTypeManagement.fieldErrors}
          mode={shiftTypeManagement.formMode}
          onCancel={shiftTypeManagement.cancelEditing}
          onDelete={shiftTypeManagement.deleteShiftType}
          onSetCategory={shiftTypeManagement.setCategory}
          onSetIsActive={shiftTypeManagement.setIsActive}
          onSubmit={shiftTypeManagement.saveShiftType}
          onTextChange={shiftTypeManagement.updateTextField}
          onToggleStatus={shiftTypeManagement.toggleShiftTypeStatus}
          shiftType={shiftTypeManagement.selectedShiftType}
          values={shiftTypeManagement.formValues}
        />
      </div>
    </section>
  );
}
