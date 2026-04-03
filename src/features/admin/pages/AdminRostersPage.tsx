import { AdminToolsSubnav } from "@/features/admin/components/AdminToolsSubnav";
import { AdminRosterWorkflowToolsSection } from "@/features/roster/components/AdminRosterWorkflowToolsSection";

export function AdminRostersPage() {
  return (
    <section className="space-y-6">
      <header className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-panel">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-brand-700">
          Admin
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">
          Rosters
        </h1>
        <p className="mt-3 max-w-3xl text-sm text-slate-600 sm:text-base">
          Generate draft rosters and manage publish, lock, unlock, and delete lifecycle
          actions from a dedicated admin tools tab.
        </p>
      </header>

      <AdminToolsSubnav />

      <AdminRosterWorkflowToolsSection showHeader={false} />
    </section>
  );
}
