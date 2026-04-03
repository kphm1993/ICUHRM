import { AdminToolsSubnav } from "@/features/admin/components/AdminToolsSubnav";
import { DoctorManagementSection } from "@/features/doctors/components/DoctorManagementSection";

export function AdminDoctorsPage() {
  return (
    <section className="space-y-6">
      <header className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-panel">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-brand-700">
          Admin
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">
          Doctors
        </h1>
        <p className="mt-3 max-w-3xl text-sm text-slate-600 sm:text-base">
          Manage doctor base data, weekend groups, and active status from a dedicated
          admin tools section without mixing those controls into the hub page.
        </p>
      </header>

      <AdminToolsSubnav />

      <DoctorManagementSection showHeader={false} />
    </section>
  );
}
