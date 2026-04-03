import { AdminRosterWorkflowToolsSection } from "@/features/roster/components/AdminRosterWorkflowToolsSection";
import { DoctorManagementSection } from "@/features/doctors/components/DoctorManagementSection";

export function AdminSettingsPage() {
  return (
    <section className="space-y-6">
      <header className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-panel">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-brand-700">
          Admin
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">
          Admin Tools
        </h1>
        <p className="mt-3 max-w-3xl text-sm text-slate-600 sm:text-base">
          Manage roster workflow tools and doctor base data from one admin-only area
          without mixing these controls into the roster review surface.
        </p>
      </header>

      <AdminRosterWorkflowToolsSection />
      <DoctorManagementSection />
    </section>
  );
}
