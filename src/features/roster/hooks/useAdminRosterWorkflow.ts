import { useEffect, useState } from "react";
import type {
  RosterSnapshot,
  WeekendGroup,
  YearMonthString
} from "@/domain/models";
import { useAppServices } from "@/app/providers/useAppServices";
import { useAuth } from "@/features/auth/context/AuthContext";
import type { RosterMonthContext } from "@/features/roster/services/rosterWorkflowService";

type WorkflowAction = "generate" | "publish" | "lock" | null;
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
  const [activeAction, setActiveAction] = useState<WorkflowAction>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function loadContext() {
    setIsLoading(true);
    setErrorMessage(null);

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
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to load roster data.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadContext();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMonth, firstWeekendOffGroup, rosterWorkflowService]);

  async function runAction(
    action: Exclude<WorkflowAction, null>,
    work: () => Promise<RosterSnapshot>
  ) {
    setActiveAction(action);
    setErrorMessage(null);

    try {
      const snapshot = await work();
      await loadContext();
      setViewMode(snapshot.roster.status === "DRAFT" ? "draft" : "official");
      return snapshot;
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Roster action failed.");
      return null;
    } finally {
      setActiveAction(null);
    }
  }

  async function generateDraft() {
    if (!user || !role) {
      return null;
    }

    return runAction("generate", () =>
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

    return runAction("publish", () =>
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

    return runAction("lock", () =>
      rosterWorkflowService.lockPublishedRoster({
        publishedRosterId: monthContext.activeOfficial!.roster.id,
        actorId: user.id,
        actorRole: role
      })
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
    generateDraft,
    publishDraft,
    lockPublishedRoster
  };
}
