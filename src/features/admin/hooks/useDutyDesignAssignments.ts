import { useEffect, useMemo, useState } from "react";
import type {
  DutyDesign,
  DutyDesignAssignment,
  ISODateString,
  YearMonthString
} from "@/domain/models";
import { useAppServices } from "@/app/providers/useAppServices";
import { useAuth } from "@/features/auth/context/AuthContext";
import {
  buildDutyDesignAssignmentCalendarWeeks,
  getDutyDesignAssignmentMonthPeriod,
  type DutyDesignAssignmentChipViewModel
} from "@/features/admin/selectors/dutyDesignAssignmentCalendarSelectors";
import { getAdminOperationErrorMessage } from "@/features/admin/services/adminOperationErrorMessage";

type DutyDesignAssignmentAction = "assign" | "unassign" | null;

function getCurrentMonth(): YearMonthString {
  return new Date().toISOString().slice(0, 7) as YearMonthString;
}

function buildAssignmentChipViewModel(
  assignment: DutyDesignAssignment,
  dutyDesign: DutyDesign | undefined
): DutyDesignAssignmentChipViewModel {
  return {
    id: assignment.id,
    dutyDesignId: assignment.dutyDesignId,
    code: dutyDesign?.code ?? assignment.dutyDesignId,
    label: dutyDesign?.label ?? assignment.dutyDesignId,
    isHolidayOverride: assignment.isHolidayOverride,
    isActive: dutyDesign?.isActive ?? false
  };
}

export function useDutyDesignAssignments() {
  const { dutyDesignAssignmentService, dutyDesignManagementService } = useAppServices();
  const { user, role } = useAuth();
  const [month, setMonth] = useState<YearMonthString>(getCurrentMonth);
  const [dutyDesigns, setDutyDesigns] = useState<ReadonlyArray<DutyDesign>>([]);
  const [assignments, setAssignments] = useState<ReadonlyArray<DutyDesignAssignment>>(
    []
  );
  const [selectedDates, setSelectedDates] = useState<ReadonlyArray<ISODateString>>([]);
  const [selectedDutyDesignId, setSelectedDutyDesignId] = useState<string>("");
  const [isHolidayOverride, setIsHolidayOverride] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [activeAction, setActiveAction] =
    useState<DutyDesignAssignmentAction>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const assignmentsByDate = useMemo(() => {
    const dutyDesignsById = new Map(dutyDesigns.map((design) => [design.id, design]));
    const nextAssignmentsByDate: Record<
      string,
      ReadonlyArray<DutyDesignAssignmentChipViewModel>
    > = {};

    for (const assignment of assignments) {
      const entry = buildAssignmentChipViewModel(
        assignment,
        dutyDesignsById.get(assignment.dutyDesignId)
      );
      nextAssignmentsByDate[assignment.date] = [
        ...(nextAssignmentsByDate[assignment.date] ?? []),
        entry
      ].sort((left, right) => {
        const labelComparison = left.label.localeCompare(right.label);
        return labelComparison !== 0
          ? labelComparison
          : left.id.localeCompare(right.id);
      });
    }

    return nextAssignmentsByDate;
  }, [assignments, dutyDesigns]);

  const selectedDateSet = useMemo(
    () => new Set<ISODateString>(selectedDates),
    [selectedDates]
  );

  const calendarWeeks = useMemo(
    () =>
      buildDutyDesignAssignmentCalendarWeeks({
        month,
        assignmentsByDate,
        selectedDates: selectedDateSet
      }),
    [assignmentsByDate, month, selectedDateSet]
  );

  const activeDutyDesignOptions = useMemo(
    () => dutyDesigns.filter((design) => design.isActive),
    [dutyDesigns]
  );

  async function loadData(nextMonth = month) {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const [nextDutyDesigns, nextAssignments] = await Promise.all([
        dutyDesignManagementService.listDutyDesigns(),
        dutyDesignAssignmentService.listAssignmentsByMonth(
          getDutyDesignAssignmentMonthPeriod(nextMonth)
        )
      ]);

      setDutyDesigns(nextDutyDesigns);
      setAssignments(nextAssignments);
    } catch (error) {
      setErrorMessage(
        getAdminOperationErrorMessage(
          error,
          "Unable to load duty design assignments."
        )
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadData(month);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month, dutyDesignAssignmentService, dutyDesignManagementService]);

  function clearMessages() {
    setErrorMessage(null);
    setSuccessMessage(null);
  }

  function setVisibleMonth(nextMonth: YearMonthString) {
    clearMessages();
    setMonth(nextMonth);
    setSelectedDates([]);
  }

  function toggleSelectedDate(date: ISODateString) {
    clearMessages();
    setSelectedDates((currentDates) =>
      currentDates.includes(date)
        ? currentDates.filter((entry) => entry !== date)
        : [...currentDates, date].sort()
    );
  }

  function clearSelectedDates() {
    setSelectedDates([]);
  }

  async function assignSelectedDates() {
    if (!user || !role) {
      setErrorMessage("Admin identity is required to manage duty design assignments.");
      return;
    }

    if (selectedDutyDesignId.trim().length === 0) {
      setErrorMessage("Choose a duty design before assigning dates.");
      return;
    }

    if (selectedDates.length === 0) {
      setErrorMessage("Select at least one date before assigning a duty design.");
      return;
    }

    const duplicateDate = selectedDates.find((date) =>
      assignments.some(
        (assignment) =>
          assignment.date === date &&
          assignment.isHolidayOverride === isHolidayOverride
      )
    );

    if (duplicateDate) {
      setErrorMessage(
        `A ${isHolidayOverride ? "holiday override" : "standard"} duty design is already assigned on ${duplicateDate}. Clear the existing mapping before retrying the batch.`
      );
      return;
    }

    setActiveAction("assign");
    clearMessages();

    try {
      const correlationId = crypto.randomUUID();

      for (const date of selectedDates) {
        await dutyDesignAssignmentService.assignDutyDesign({
          actorId: user.id,
          actorRole: role,
          correlationId,
          batchDateCount: selectedDates.length,
          date,
          dutyDesignId: selectedDutyDesignId,
          isHolidayOverride
        });
      }

      const assignedDutyDesign = dutyDesigns.find(
        (dutyDesign) => dutyDesign.id === selectedDutyDesignId
      );

      await loadData(month);
      setSelectedDates([]);
      setSuccessMessage(
        `Assigned ${assignedDutyDesign?.label ?? "duty design"} to ${selectedDates.length} date${selectedDates.length === 1 ? "" : "s"}.`
      );
    } catch (error) {
      setErrorMessage(
        getAdminOperationErrorMessage(
          error,
          "Unable to assign duty design dates."
        )
      );
    } finally {
      setActiveAction(null);
    }
  }

  async function unassignDutyDesign(assignmentId: string) {
    if (!user || !role) {
      setErrorMessage("Admin identity is required to manage duty design assignments.");
      return;
    }

    setActiveAction("unassign");
    clearMessages();

    try {
      const assignment = assignments.find((entry) => entry.id === assignmentId);
      await dutyDesignAssignmentService.unassignDutyDesign({
        assignmentId,
        actorId: user.id,
        actorRole: role
      });

      await loadData(month);
      setSuccessMessage(
        assignment
          ? `Removed assignment on ${assignment.date}.`
          : "Assignment removed."
      );
    } catch (error) {
      setErrorMessage(
        getAdminOperationErrorMessage(
          error,
          "Unable to remove duty design assignment."
        )
      );
    } finally {
      setActiveAction(null);
    }
  }

  return {
    month,
    dutyDesigns,
    activeDutyDesignOptions,
    selectedDates,
    selectedDutyDesignId,
    isHolidayOverride,
    calendarWeeks,
    isLoading,
    activeAction,
    errorMessage,
    successMessage,
    setVisibleMonth,
    toggleSelectedDate,
    clearSelectedDates,
    setSelectedDutyDesignId,
    setIsHolidayOverride,
    assignSelectedDates,
    unassignDutyDesign
  };
}
