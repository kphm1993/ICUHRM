import { AdminToolsSubnav } from "@/features/admin/components/AdminToolsSubnav";
import { AdminRosterWorkflowToolsSection } from "@/features/roster/components/AdminRosterWorkflowToolsSection";
import { RosterWizardDialog } from "@/features/roster/components/RosterWizardDialog";
import { RosterWizardDraftList } from "@/features/roster/components/RosterWizardDraftList";
import { RosterWizardLaunchPanel } from "@/features/roster/components/RosterWizardLaunchPanel";
import { useRosterWizard } from "@/features/roster/hooks/useRosterWizard";

export function AdminRostersPage() {
  const wizard = useRosterWizard();

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
          Start resumable wizard drafts while keeping the current snapshot generation
          and roster lifecycle tools available below during the staged rollout.
        </p>
      </header>

      <AdminToolsSubnav />

      {wizard.errorMessage ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
          {wizard.errorMessage}
        </div>
      ) : null}

      {wizard.successMessage ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          {wizard.successMessage}
        </div>
      ) : null}

      <RosterWizardLaunchPanel
        selectedMonth={wizard.selectedMonth}
        onSelectedMonthChange={wizard.setSelectedMonth}
        onCreateDraft={wizard.createDraft}
        isCreating={wizard.activeAction === "create"}
        draftCount={wizard.drafts.length}
      />

      <RosterWizardDraftList
        drafts={wizard.drafts}
        activeDraftId={wizard.activeDraftId}
        isLoading={wizard.isLoading}
        isBusy={wizard.activeAction !== null}
        onResumeDraft={wizard.openDraft}
      />

      <AdminRosterWorkflowToolsSection showHeader={false} />

      <RosterWizardDialog
        isOpen={wizard.isDialogOpen}
        draft={wizard.activeDraft}
        draftName={wizard.draftName}
        activeAction={wizard.activeAction}
        onDraftNameChange={wizard.setDraftName}
        onClose={wizard.closeDialog}
        onStepSelect={wizard.goToStep}
        onPreviousStep={wizard.goToPreviousStep}
        onNextStep={wizard.goToNextStep}
        onPublish={wizard.publishDraft}
        onLock={wizard.lockDraft}
        onUnlock={wizard.unlockDraft}
        onDelete={wizard.deleteDraft}
      />
    </section>
  );
}
