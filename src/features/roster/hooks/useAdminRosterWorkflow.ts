import { useEffect, useState } from "react";
import type {
  RosterSnapshot,
  WeekendGroup,
  YearMonthString
} from "@/domain/models";
import { useAppServices } from "@/app/providers/useAppServices";
import { useAuth } from "@/features/auth/context/AuthContext";
import { getAdminOperationErrorMessage } from "@/features/admin/services/adminOperationErrorMessage";
import type { RosterMonthContext } from "@/features/roster/services/rosterWorkflowService";

type WorkflowAction = "generate" | "publish" | "lock" | null;
type ExtendedWorkflowAction =
  | "generate"
  | "publish"
  | "lock"
  | "unlock"
  | "delete"
  | null;
type SnapshotViewMode = "draft" | "official";

function getCurrentRosterMonth(): YearMonthString {
  return new Date().toISOString().slice(0, 7) as YearMonthString;
}

export function useAdminRosterWorkflow() {
  const { rosterWorkflowService } = useAppServices();
  const { user, role } = useAuth();
  const [selectedMonth, setSelectedMonth] = useState<YearMonthString>(
    getCurrentRosterMonth()
  );
  const [firstWeekendOffGroup, setFirstWeekendOffGroup] =
    useState<WeekendGroup>("A");
  const [notes, setNotes] = useState("");
  const [monthContext, setMonthContext] = useState<RosterMonthContext | null>(null);
  const [viewMode, setViewMode] = useState<SnapshotViewMode>("draft");
  const [isLoading, setIsLoading] = useState(true);
  const [activeAction, setActiveAction] = useState<ExtendedWorkflowAction>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  async function loadContext() {
    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const nextContext = await rosterWorkflowService.getMonthContext({
        rosterMonth: selectedMonth,
        firstWeekendOffGroup
      });
      setMonthContext(nextContext);

      if (viewMode === "draft" && !nextContext.latestDraft && nextContext.activeOfficial) {
        setViewMode("official");
      }

      if (viewMode === "official" && !nextContext.activeOfficial && nextContext.latestDraft) {
        setViewMode("draft");
      }

      return nextContext;
    } catch (error) {
      setErrorMessage(
        getAdminOperationErrorMessage(error, "Unable to load roster data.")
      );
      return null;
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadContext();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMonth, firstWeekendOffGroup, rosterWorkflowService]);

  async function runSnapshotAction(
    action: Exclude<ExtendedWorkflowAction, null>,
    work: () => Promise<RosterSnapshot>,
    successMessageText?: string
  ) {
    setActiveAction(action);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const snapshot = await work();
      await loadContext();
      setViewMode(snapshot.roster.status === "DRAFT" ? "draft" : "official");
      if (successMessageText) {
        setSuccessMessage(successMessageText);
      }
      return snapshot;
    } catch (error) {
      setErrorMessage(
        getAdminOperationErrorMessage(error, "Roster action failed.")
      );
      return null;
    } finally {
      setActiveAction(null);
    }
  }

  async function runVoidAction(
    action: Exclude<ExtendedWorkflowAction, null>,
    work: () => Promise<void>,
    successMessageText: string
  ) {
    setActiveAction(action);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await work();
      await loadContext();
      setSuccessMessage(successMessageText);
      return true;
    } catch (error) {
      setErrorMessage(
        getAdminOperationErrorMessage(error, "Roster action failed.")
      );
      return false;
    } finally {
      setActiveAction(null);
    }
  }

  async function generateDraft() {
    if (!user || !role) {
      return null;
    }

    return runSnapshotAction("generate", () =>
      rosterWorkflowService.generateDraft({
        rosterMonth: selectedMonth,
        firstWeekendOffGroup,
        notes: notes.trim() || undefined,
        actorId: user.id,
        actorRole: role
      })
    );
  }

  async function publishDraft() {
    if (!user || !role || !monthContext?.latestDraft) {
      return null;
    }

    return runSnapshotAction("publish", () =>
      rosterWorkflowService.publishDraft({
        draftRosterId: monthContext.latestDraft!.roster.id,
        actorId: user.id,
        actorRole: role
      })
    );
  }

  async function lockPublishedRoster() {
    if (!user || !role || monthContext?.activeOfficial?.roster.status !== "PUBLISHED") {
      return null;
    }

    return runSnapshotAction("lock", () =>
      rosterWorkflowService.lockPublishedRoster({
        publishedRosterId: monthContext.activeOfficial!.roster.id,
        actorId: user.id,
        actorRole: role
      })
    );
  }

  async function unlockLockedRoster() {
    if (!user || !role || monthContext?.activeOfficial?.roster.status !== "LOCKED") {
      return null;
    }

    return runSnapshotAction(
      "unlock",
      () =>
        rosterWorkflowService.unlockLockedRoster({
          lockedRosterId: monthContext.activeOfficial!.roster.id,
          actorId: user.id,
          actorRole: role
        }),
      "Roster unlocked and reopened as published."
    );
  }

  async function deleteRoster() {
    if (!user || !role || !displaySnapshot) {
      return false;
    }

    return runVoidAction(
      "delete",
      () =>
        rosterWorkflowService.deleteRoster({
          rosterId: displaySnapshot.roster.id,
          actorId: user.id,
          actorRole: role
        }),
      "Roster deleted."
    );
  }

  const displaySnapshot =
    viewMode === "official"
      ? (monthContext?.activeOfficial ?? monthContext?.latestDraft ?? null)
      : (monthContext?.latestDraft ?? monthContext?.activeOfficial ?? null);

  return {
    selectedMonth,
    setSelectedMonth: setSelectedMonth as (value: YearMonthString) => void,
    firstWeekendOffGroup,
    setFirstWeekendOffGroup,
    notes,
    setNotes,
    monthContext,
    displaySnapshot,
    viewMode,
    setViewMode,
    isLoading,
    activeAction,
    errorMessage,
    successMessage,
    reloadContext: loadContext,
    generateDraft,
    publishDraft,
    lockPublishedRoster,
    unlockLockedRoster,
    deleteRoster
  };
}
