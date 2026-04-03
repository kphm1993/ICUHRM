import { useEffect, useState } from "react";
import type { RosterSnapshot, YearMonthString } from "@/domain/models";
import { useAppServices } from "@/app/providers/useAppServices";
import { useAuth } from "@/features/auth/context/AuthContext";
import {
  buildFairnessComparisonRows,
  type RosterDoctorSummaryRow
} from "@/features/roster/selectors/rosterReviewSelectors";
import type { RosterMonthContext } from "@/features/roster/services/rosterWorkflowService";

function getCurrentRosterMonth(): YearMonthString {
  return new Date().toISOString().slice(0, 7) as YearMonthString;
}

export function useRosterView() {
  const { rosterWorkflowService } = useAppServices();
  const { role } = useAuth();
  const [selectedMonth, setSelectedMonth] = useState<YearMonthString>(
    getCurrentRosterMonth()
  );
  const [monthContext, setMonthContext] = useState<RosterMonthContext | null>(null);
  const [comparisonRows, setComparisonRows] = useState<
    ReadonlyArray<RosterDoctorSummaryRow>
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isSubscribed = true;

    async function loadView() {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const nextContext = await rosterWorkflowService.getMonthContext({
          rosterMonth: selectedMonth
        });

        if (!isSubscribed) {
          return;
        }

        const visibleSnapshot: RosterSnapshot | null =
          role === "ADMIN"
            ? (nextContext.activeOfficial ?? nextContext.latestDraft ?? null)
            : nextContext.activeOfficial;

        setMonthContext(nextContext);
        setComparisonRows(
          buildFairnessComparisonRows({
            doctors: nextContext.activeDoctors,
            snapshot: visibleSnapshot,
            currentBias: nextContext.currentBias,
            currentWeekdayPairBias: nextContext.currentWeekdayPairBias,
            activeBiasCriteria: nextContext.activeBiasCriteria
          })
        );
      } catch (error) {
        if (!isSubscribed) {
          return;
        }

        setErrorMessage(error instanceof Error ? error.message : "Unable to load roster view.");
      } finally {
        if (isSubscribed) {
          setIsLoading(false);
        }
      }
    }

    void loadView();

    return () => {
      isSubscribed = false;
    };
  }, [role, rosterWorkflowService, selectedMonth]);

  const visibleSnapshot =
    role === "ADMIN"
      ? (monthContext?.activeOfficial ?? monthContext?.latestDraft ?? null)
      : (monthContext?.activeOfficial ?? null);

  return {
    selectedMonth,
    setSelectedMonth: setSelectedMonth as (value: YearMonthString) => void,
    monthContext,
    visibleSnapshot,
    comparisonRows,
    isLoading,
    errorMessage
  };
}
