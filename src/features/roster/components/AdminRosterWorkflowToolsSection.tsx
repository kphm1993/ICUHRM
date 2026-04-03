import { useAdminRosterWorkflow } from "@/features/roster/hooks/useAdminRosterWorkflow";
import { RosterGenerationPanel } from "@/features/roster/components/RosterGenerationPanel";
import { RosterLifecycleActions } from "@/features/roster/components/RosterLifecycleActions";

export function AdminRosterWorkflowToolsSection() {
  const workflow = useAdminRosterWorkflow();

  const canGenerate =
    Boolean(workflow.monthContext) &&
    workflow.activeAction === null &&
    !workflow.monthContext?.activeOfficial &&
    !workflow.monthContext?.latestLocked;
  const canPublish =
    workflow.activeAction === null &&
    Boolean(workflow.monthContext?.latestDraft) &&
    !workflow.monthContext?.latestLocked;
  const canLock =
    workflow.activeAction === null &&
    workflow.monthContext?.activeOfficial?.roster.status === "PUBLISHED" &&
    !workflow.monthContext?.latestLocked;

  return (
    <section className="space-y-6">
      <header className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-panel">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-brand-700">
          Admin Tools
        </p>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">
          Roster Workflow Tools
        </h2>
        <p className="mt-3 max-w-3xl text-sm text-slate-600 sm:text-base">
          Generate draft rosters, then publish and lock immutable official snapshots
          from the admin tools area instead of the roster review page.
        </p>
      </header>

      {workflow.errorMessage ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
          {workflow.errorMessage}
        </div>
      ) : null}

      {workflow.isLoading ? (
        <div className="rounded-2xl border border-slate-200 bg-white/90 px-4 py-6 text-sm text-slate-600 shadow-panel">
          Loading admin roster workflow tools...
        </div>
      ) : null}

      <RosterGenerationPanel
        selectedMonth={workflow.selectedMonth}
        onSelectedMonthChange={workflow.setSelectedMonth}
        firstWeekendOffGroup={workflow.firstWeekendOffGroup}
        onFirstWeekendOffGroupChange={workflow.setFirstWeekendOffGroup}
        notes={workflow.notes}
        onNotesChange={workflow.setNotes}
        sourceSummary={workflow.monthContext?.sourceSummary ?? null}
        shiftTypes={workflow.monthContext?.shiftTypes ?? []}
        isGenerating={workflow.activeAction === "generate"}
        onGenerate={workflow.generateDraft}
        canGenerate={canGenerate}
      />

      <RosterLifecycleActions
        latestDraft={workflow.monthContext?.latestDraft ?? null}
        activeOfficial={workflow.monthContext?.activeOfficial ?? null}
        viewMode={workflow.viewMode}
        onViewModeChange={workflow.setViewMode}
        canPublish={canPublish}
        canLock={Boolean(canLock)}
        activeAction={workflow.activeAction}
        onPublish={workflow.publishDraft}
        onLock={workflow.lockPublishedRoster}
      />
    </section>
  );
}
