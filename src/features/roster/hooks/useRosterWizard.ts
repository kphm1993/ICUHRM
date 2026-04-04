import { useEffect, useState } from "react";
import type { RosterWizardDraft, RosterWizardStep, YearMonthString } from "@/domain/models";
import { useAppServices } from "@/app/providers/useAppServices";
import { getAdminOperationErrorMessage } from "@/features/admin/services/adminOperationErrorMessage";
import { useAuth } from "@/features/auth/context/AuthContext";

type RosterWizardAction =
  | "create"
  | "open"
  | "save"
  | "publish"
  | "lock"
  | "unlock"
  | "delete"
  | null;

function getCurrentRosterMonth(): YearMonthString {
  return new Date().toISOString().slice(0, 7) as YearMonthString;
}

function sortDrafts(
  drafts: ReadonlyArray<RosterWizardDraft>
): ReadonlyArray<RosterWizardDraft> {
  return [...drafts].sort((left, right) => {
    const updatedAtComparison = right.updatedAt.localeCompare(left.updatedAt);
    if (updatedAtComparison !== 0) {
      return updatedAtComparison;
    }

    const createdAtComparison = right.createdAt.localeCompare(left.createdAt);
    if (createdAtComparison !== 0) {
      return createdAtComparison;
    }

    return left.id.localeCompare(right.id);
  });
}

export function useRosterWizard() {
  const { rosterWizardService } = useAppServices();
  const { user, role } = useAuth();
  const [selectedMonth, setSelectedMonth] = useState<YearMonthString>(
    getCurrentRosterMonth()
  );
  const [drafts, setDrafts] = useState<ReadonlyArray<RosterWizardDraft>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeAction, setActiveAction] = useState<RosterWizardAction>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [activeDraft, setActiveDraft] = useState<RosterWizardDraft | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [draftName, setDraftName] = useState("");

  function setActiveDraftState(draft: RosterWizardDraft | null) {
    setActiveDraft(draft);
    setDraftName(draft?.name ?? "");
  }

  function upsertDraft(nextDraft: RosterWizardDraft) {
    setDrafts((currentDrafts) =>
      sortDrafts([
        ...currentDrafts.filter((draft) => draft.id !== nextDraft.id),
        nextDraft
      ])
    );
  }

  function removeDraft(draftId: string) {
    setDrafts((currentDrafts) => currentDrafts.filter((draft) => draft.id !== draftId));
  }

  async function loadDrafts(showLoadingState = true) {
    if (!user || role !== "ADMIN") {
      setDrafts([]);
      setActiveDraftState(null);
      setIsDialogOpen(false);
      setIsLoading(false);
      return [];
    }

    if (showLoadingState) {
      setIsLoading(true);
    }

    try {
      const nextDrafts = await rosterWizardService.listDraftsByAdmin({
        actorId: user.id,
        actorRole: role
      });
      setDrafts(nextDrafts);

      if (activeDraft) {
        const refreshedDraft =
          nextDrafts.find((draft) => draft.id === activeDraft.id) ?? null;

        if (!refreshedDraft) {
          setActiveDraftState(null);
          setIsDialogOpen(false);
        } else {
          setActiveDraftState(refreshedDraft);
        }
      }

      return nextDrafts;
    } catch (error) {
      setErrorMessage(
        getAdminOperationErrorMessage(error, "Unable to load roster wizard drafts.")
      );
      return [];
    } finally {
      if (showLoadingState) {
        setIsLoading(false);
      }
    }
  }

  useEffect(() => {
    void loadDrafts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rosterWizardService, user?.id, role]);

  async function createDraft() {
    if (!user || role !== "ADMIN") {
      return null;
    }

    setActiveAction("create");
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const createdDraft = await rosterWizardService.createDraft({
        rosterMonth: selectedMonth,
        actorId: user.id,
        actorRole: role
      });
      upsertDraft(createdDraft);
      setActiveDraftState(createdDraft);
      setIsDialogOpen(true);
      setSuccessMessage(`Created wizard draft '${createdDraft.name}'.`);
      return createdDraft;
    } catch (error) {
      setErrorMessage(
        getAdminOperationErrorMessage(error, "Unable to create wizard draft.")
      );
      return null;
    } finally {
      setActiveAction(null);
    }
  }

  async function openDraft(draftId: string) {
    if (!user || role !== "ADMIN") {
      return null;
    }

    setActiveAction("open");
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const draft = await rosterWizardService.loadDraftById({
        draftId,
        actorId: user.id,
        actorRole: role
      });
      upsertDraft(draft);
      setActiveDraftState(draft);
      setIsDialogOpen(true);
      return draft;
    } catch (error) {
      setErrorMessage(
        getAdminOperationErrorMessage(error, "Unable to open wizard draft.")
      );
      return null;
    } finally {
      setActiveAction(null);
    }
  }

  async function flushDraftNameChanges() {
    if (!activeDraft || !user || role !== "ADMIN" || activeDraft.status === "LOCKED") {
      return activeDraft;
    }

    const normalizedDraftName = draftName.trim();

    if (normalizedDraftName === activeDraft.name) {
      return activeDraft;
    }

    setActiveAction("save");
    setErrorMessage(null);

    try {
      const savedDraft = await rosterWizardService.saveDraftStep({
        draftId: activeDraft.id,
        currentStep: activeDraft.currentStep,
        changes: {
          name: normalizedDraftName
        },
        actorId: user.id,
        actorRole: role
      });
      upsertDraft(savedDraft);
      setActiveDraftState(savedDraft);
      return savedDraft;
    } catch (error) {
      setErrorMessage(
        getAdminOperationErrorMessage(error, "Unable to save wizard draft.")
      );
      return null;
    } finally {
      setActiveAction(null);
    }
  }

  async function saveStep(currentStep: RosterWizardStep) {
    if (!activeDraft || !user || role !== "ADMIN") {
      return null;
    }

    setActiveAction("save");
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const savedDraft = await rosterWizardService.saveDraftStep({
        draftId: activeDraft.id,
        currentStep,
        changes: {
          name: draftName.trim()
        },
        actorId: user.id,
        actorRole: role
      });
      upsertDraft(savedDraft);
      setActiveDraftState(savedDraft);
      return savedDraft;
    } catch (error) {
      setErrorMessage(
        getAdminOperationErrorMessage(error, "Unable to save wizard draft.")
      );
      return null;
    } finally {
      setActiveAction(null);
    }
  }

  async function closeDialog() {
    const flushedDraft = await flushDraftNameChanges();

    if (activeDraft && activeDraft.status !== "LOCKED" && flushedDraft === null) {
      return;
    }

    setIsDialogOpen(false);
    setActiveDraftState(null);
  }

  async function goToStep(step: RosterWizardStep) {
    if (!activeDraft || activeDraft.status === "LOCKED" || step === activeDraft.currentStep) {
      return;
    }

    await saveStep(step);
  }

  async function goToPreviousStep() {
    if (!activeDraft || activeDraft.currentStep === 1) {
      return;
    }

    await goToStep((activeDraft.currentStep - 1) as RosterWizardStep);
  }

  async function goToNextStep() {
    if (!activeDraft || activeDraft.currentStep === 5) {
      return;
    }

    await goToStep((activeDraft.currentStep + 1) as RosterWizardStep);
  }

  async function runStatusAction(
    action: Exclude<RosterWizardAction, null | "create" | "open" | "save">,
    work: (draftId: string) => Promise<RosterWizardDraft | void>,
    successText: string
  ) {
    if (!activeDraft || !user || role !== "ADMIN") {
      return null;
    }

    const flushedDraft = await flushDraftNameChanges();
    const draftId = flushedDraft?.id ?? activeDraft.id;

    setActiveAction(action);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const result = await work(draftId);

      if (result) {
        upsertDraft(result);
        setActiveDraftState(result);
      } else {
        removeDraft(draftId);
        setIsDialogOpen(false);
        setActiveDraftState(null);
      }

      await loadDrafts(false);
      setSuccessMessage(successText);
      return result ?? null;
    } catch (error) {
      setErrorMessage(
        getAdminOperationErrorMessage(error, "Wizard draft action failed.")
      );
      return null;
    } finally {
      setActiveAction(null);
    }
  }

  async function publishDraft() {
    if (!user || role !== "ADMIN") {
      return null;
    }

    return runStatusAction(
      "publish",
      (draftId) =>
        rosterWizardService.publishDraft({
          draftId,
          actorId: user.id,
          actorRole: role
        }),
      "Wizard draft published."
    );
  }

  async function lockDraft() {
    if (!user || role !== "ADMIN") {
      return null;
    }

    return runStatusAction(
      "lock",
      (draftId) =>
        rosterWizardService.lockDraft({
          draftId,
          actorId: user.id,
          actorRole: role
        }),
      "Wizard draft locked."
    );
  }

  async function unlockDraft() {
    if (!user || role !== "ADMIN") {
      return null;
    }

    return runStatusAction(
      "unlock",
      (draftId) =>
        rosterWizardService.unlockDraft({
          draftId,
          actorId: user.id,
          actorRole: role
        }),
      "Wizard draft unlocked."
    );
  }

  async function deleteDraft() {
    if (!activeDraft || !user || role !== "ADMIN") {
      return null;
    }

    return runStatusAction(
      "delete",
      async (draftId) => {
        await rosterWizardService.deleteDraft({
          draftId,
          actorId: user.id,
          actorRole: role
        });
      },
      "Wizard draft deleted."
    );
  }

  return {
    selectedMonth,
    setSelectedMonth: setSelectedMonth as (value: YearMonthString) => void,
    drafts,
    isLoading,
    activeAction,
    errorMessage,
    successMessage,
    activeDraft,
    activeDraftId: activeDraft?.id ?? null,
    draftName,
    isDialogOpen,
    setDraftName,
    createDraft,
    openDraft,
    closeDialog,
    goToStep,
    goToPreviousStep,
    goToNextStep,
    publishDraft,
    lockDraft,
    unlockDraft,
    deleteDraft,
    reloadDrafts: loadDrafts
  };
}
