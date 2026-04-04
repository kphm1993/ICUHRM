import { useEffect, useState } from "react";
import type {
  AllowedDoctorGroupIdByDate,
  ISODateString,
  RosterSnapshot,
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
  const [notes, setNotes] = useState("");
  const [allowedDoctorGroupIdByDate, setAllowedDoctorGroupIdByDate] =
    useState<AllowedDoctorGroupIdByDate>({});
  const [selectedConstraintDates, setSelectedConstraintDates] = useState<
    ReadonlyArray<ISODateString>
  >([]);
  const [selectedConstraintGroupId, setSelectedConstraintGroupId] = useState("");
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
        rosterMonth: selectedMonth
      });
      setMonthContext(nextContext);
      setAllowedDoctorGroupIdByDate(
        nextContext.latestDraft?.generatedInputSummary.allowedDoctorGroupIdByDate ??
          nextContext.activeOfficial?.generatedInputSummary.allowedDoctorGroupIdByDate ??
          {}
      );
      setSelectedConstraintDates([]);
      setSelectedConstraintGroupId("");

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
  }, [selectedMonth, rosterWorkflowService]);

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
        allowedDoctorGroupIdByDate,
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

  function toggleConstraintDate(date: ISODateString) {
    setErrorMessage(null);
    setSuccessMessage(null);
    setSelectedConstraintDates((currentDates) =>
      currentDates.includes(date)
        ? currentDates.filter((entry) => entry !== date)
        : [...currentDates, date].sort()
    );
  }

  function clearSelectedConstraintDates() {
    setSelectedConstraintDates([]);
  }

  function applySelectedGroupConstraint() {
    if (!selectedConstraintGroupId) {
      setErrorMessage("Choose a group before applying date constraints.");
      return;
    }

    if (selectedConstraintDates.length === 0) {
      setErrorMessage("Select at least one date before applying a group constraint.");
      return;
    }

    setAllowedDoctorGroupIdByDate((currentMap) => {
      const nextMap = { ...currentMap };

      selectedConstraintDates.forEach((date) => {
        nextMap[date] = selectedConstraintGroupId;
      });

      return nextMap;
    });
    setSelectedConstraintDates([]);
    setSuccessMessage(
      `Applied a group constraint to ${selectedConstraintDates.length} date${
        selectedConstraintDates.length === 1 ? "" : "s"
      }.`
    );
  }

  function clearConstraintForDate(date: ISODateString) {
    setAllowedDoctorGroupIdByDate((currentMap) => {
      if (!currentMap[date]) {
        return currentMap;
      }

      const nextMap = { ...currentMap };
      delete nextMap[date];
      return nextMap;
    });
    setErrorMessage(null);
    setSuccessMessage(`Cleared the group constraint on ${date}.`);
  }

  return {
    selectedMonth,
    setSelectedMonth: setSelectedMonth as (value: YearMonthString) => void,
    notes,
    setNotes,
    allowedDoctorGroupIdByDate,
    selectedConstraintDates,
    selectedConstraintGroupId,
    monthContext,
    displaySnapshot,
    viewMode,
    setViewMode,
    isLoading,
    activeAction,
    errorMessage,
    successMessage,
    reloadContext: loadContext,
    toggleConstraintDate,
    clearSelectedConstraintDates,
    setSelectedConstraintGroupId,
    applySelectedGroupConstraint,
    clearConstraintForDate,
    generateDraft,
    publishDraft,
    lockPublishedRoster,
    unlockLockedRoster,
    deleteRoster
  };
}
