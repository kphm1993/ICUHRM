import { AdminToolsSubnav } from "@/features/admin/components/AdminToolsSubnav";
import { DutyLocationEditorForm } from "@/features/admin/components/DutyLocationEditorForm";
import { DutyLocationList } from "@/features/admin/components/DutyLocationList";
import { useDutyLocationManagement } from "@/features/admin/hooks/useDutyLocationManagement";

export function AdminLocationsPage() {
  const locationManagement = useDutyLocationManagement();

  return (
    <section className="space-y-6">
      <header className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-panel">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-brand-700">
          Admin
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">
          Duty Locations
        </h1>
        <p className="mt-3 max-w-3xl text-sm text-slate-600 sm:text-base">
          Manage persisted duty locations with explicit validation, conservative
          delete safety, and audit logging that matches the rest of the admin tools
          workflow. Phase 3 roster generation currently requires exactly one active
          duty location.
        </p>
      </header>

      <AdminToolsSubnav />

      {locationManagement.errorMessage ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
          {locationManagement.errorMessage}
        </div>
      ) : null}

      {locationManagement.successMessage ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          {locationManagement.successMessage}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <DutyLocationList
          isLoading={locationManagement.isLoading}
          locations={locationManagement.locations}
          onCreateLocation={locationManagement.beginCreateLocation}
          onSelectLocation={locationManagement.beginEditLocation}
          selectedLocationId={locationManagement.selectedLocationId}
        />

        <DutyLocationEditorForm
          activeAction={locationManagement.activeAction}
          fieldErrors={locationManagement.fieldErrors}
          location={locationManagement.selectedLocation}
          mode={locationManagement.formMode}
          onCancel={locationManagement.cancelEditing}
          onChange={locationManagement.updateFormValue}
          onDelete={locationManagement.deleteLocation}
          onSubmit={locationManagement.saveLocation}
          onToggleStatus={locationManagement.toggleLocationStatus}
          values={locationManagement.formValues}
        />
      </div>
    </section>
  );
}
