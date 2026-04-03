import { useEffect, useMemo, useState } from "react";
import type {
  BiasCriteria,
  DayOfWeek,
  DutyLocation,
  ShiftType,
  YearMonthString
} from "@/domain/models";
import { useAppServices } from "@/app/providers/useAppServices";
import { useAuth } from "@/features/auth/context/AuthContext";
import { buildBiasCriteriaPreview } from "@/features/admin/services/biasCriteriaPreview";
import { getAdminOperationErrorMessage } from "@/features/admin/services/adminOperationErrorMessage";
import { BiasCriteriaValidationError } from "@/features/admin/services/biasCriteriaManagementValidation";
import type { DoctorBiasSummary } from "@/features/admin/services/biasCriteriaManagementService";

export interface BiasCriteriaFormValues {
  readonly code: string;
  readonly label: string;
  readonly locationIds: ReadonlyArray<string>;
  readonly shiftTypeIds: ReadonlyArray<string>;
  readonly weekdayConditions: ReadonlyArray<DayOfWeek>;
  readonly isWeekendOnly: boolean;
}

export interface BiasCriteriaFormFieldErrors {
  readonly code?: string;
  readonly label?: string;
  readonly weekdayConditions?: string;
  readonly isWeekendOnly?: string;
}

type FormMode = "create" | "edit";
type BiasCriteriaAction = "save" | "delete" | "status" | "lock" | null;

const WEEKDAY_ORDER: ReadonlyArray<DayOfWeek> = [
  "MON",
  "TUE",
  "WED",
  "THU",
  "FRI",
  "SAT",
  "SUN"
];

function createEmptyBiasCriteriaFormValues(): BiasCriteriaFormValues {
  return {
    code: "",
    label: "",
    locationIds: [],
    shiftTypeIds: [],
    weekdayConditions: [],
    isWeekendOnly: false
  };
}

function createFormValuesFromCriteria(
  criteria: BiasCriteria
): BiasCriteriaFormValues {
  return {
    code: criteria.code,
    label: criteria.label,
    locationIds: [...criteria.locationIds],
    shiftTypeIds: [...criteria.shiftTypeIds],
    weekdayConditions: [...criteria.weekdayConditions],
    isWeekendOnly: criteria.isWeekendOnly
  };
}

function dedupeIds(ids: ReadonlyArray<string>): ReadonlyArray<string> {
  return Array.from(new Set(ids));
}

function sortDays(days: ReadonlyArray<DayOfWeek>): ReadonlyArray<DayOfWeek> {
  return [...new Set(days)].sort(
    (left, right) => WEEKDAY_ORDER.indexOf(left) - WEEKDAY_ORDER.indexOf(right)
  );
}

function toggleListValue<T extends string>(
  values: ReadonlyArray<T>,
  value: T
): ReadonlyArray<T> {
  return values.includes(value)
    ? values.filter((entry) => entry !== value)
    : [...values, value];
}

function getCurrentBiasMonth(): YearMonthString {
  return new Date().toISOString().slice(0, 7) as YearMonthString;
}

export function useBiasCriteriaManagement() {
  const {
    biasCriteriaManagementService,
    dutyLocationManagementService,
    shiftTypeManagementService
  } = useAppServices();
  const { user, role } = useAuth();
  const [criteriaEntries, setCriteriaEntries] = useState<ReadonlyArray<BiasCriteria>>([]);
  const [locations, setLocations] = useState<ReadonlyArray<DutyLocation>>([]);
  const [shiftTypes, setShiftTypes] = useState<ReadonlyArray<ShiftType>>([]);
  const [selectedCriteriaId, setSelectedCriteriaId] = useState<string | null>(null);
  const [formMode, setFormMode] = useState<FormMode>("create");
  const [formValues, setFormValues] = useState<BiasCriteriaFormValues>(
    createEmptyBiasCriteriaFormValues()
  );
  const [fieldErrors, setFieldErrors] = useState<BiasCriteriaFormFieldErrors>({});
  const [isLoading, setIsLoading] = useState(true);
  const [activeAction, setActiveAction] = useState<BiasCriteriaAction>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [expandedCriteriaId, setExpandedCriteriaId] = useState<string | null>(null);
  const [doctorBiasListsByCriteriaId, setDoctorBiasListsByCriteriaId] = useState<
    Record<string, ReadonlyArray<DoctorBiasSummary>>
  >({});
  const [loadingDoctorBiasCriteriaIds, setLoadingDoctorBiasCriteriaIds] =
    useState<ReadonlySet<string>>(new Set());
  const [doctorBiasListErrors, setDoctorBiasListErrors] = useState<
    Record<string, string>
  >({});

  const selectedCriteria =
    criteriaEntries.find((criteria) => criteria.id === selectedCriteriaId) ?? null;

  const previewText = useMemo(
    () =>
      buildBiasCriteriaPreview(formValues, {
        locations,
        shiftTypes
      }),
    [formValues, locations, shiftTypes]
  );

  async function loadData(nextSelectedCriteriaId?: string | null) {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const [nextCriteriaEntries, nextLocations, nextShiftTypes] = await Promise.all([
        biasCriteriaManagementService.getCriteriaList(),
        dutyLocationManagementService.getLocationList(),
        shiftTypeManagementService.listShiftTypes()
      ]);

      setCriteriaEntries(nextCriteriaEntries);
      setLocations(nextLocations);
      setShiftTypes(nextShiftTypes);

      const resolvedSelectedCriteriaId =
        nextSelectedCriteriaId === undefined
          ? selectedCriteriaId
          : nextSelectedCriteriaId;
      const nextSelectedCriteria =
        resolvedSelectedCriteriaId === null
          ? null
          : nextCriteriaEntries.find(
              (criteria) => criteria.id === resolvedSelectedCriteriaId
            ) ?? null;

      if (nextSelectedCriteria) {
        setSelectedCriteriaId(nextSelectedCriteria.id);
        setFormMode("edit");
        setFormValues(createFormValuesFromCriteria(nextSelectedCriteria));
      } else {
        setSelectedCriteriaId(null);
        setFormMode("create");
        setFormValues(createEmptyBiasCriteriaFormValues());
      }

      setExpandedCriteriaId((currentExpandedCriteriaId) => {
        if (currentExpandedCriteriaId === null) {
          return null;
        }

        return nextCriteriaEntries.some(
          (criteria) => criteria.id === currentExpandedCriteriaId
        )
          ? currentExpandedCriteriaId
          : null;
      });
    } catch (error) {
      setErrorMessage(
        getAdminOperationErrorMessage(error, "Unable to load bias criteria.")
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadData(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    biasCriteriaManagementService,
    dutyLocationManagementService,
    shiftTypeManagementService
  ]);

  function clearMessages() {
    setErrorMessage(null);
    setSuccessMessage(null);
  }

  function clearFieldErrors() {
    setFieldErrors({});
  }

  function beginCreateCriteria() {
    clearMessages();
    clearFieldErrors();
    setSelectedCriteriaId(null);
    setExpandedCriteriaId(null);
    setFormMode("create");
    setFormValues(createEmptyBiasCriteriaFormValues());
  }

  function beginEditCriteria(criteriaId: string) {
    const criteria = criteriaEntries.find((entry) => entry.id === criteriaId);

    if (!criteria) {
      return;
    }

    clearMessages();
    clearFieldErrors();
    setSelectedCriteriaId(criteria.id);
    setFormMode("edit");
    setFormValues(createFormValuesFromCriteria(criteria));
  }

  async function loadDoctorBiasList(criteriaId: string, forceReload = false) {
    if (!forceReload && doctorBiasListsByCriteriaId[criteriaId]) {
      return;
    }

    setLoadingDoctorBiasCriteriaIds((currentIds) => {
      const nextIds = new Set(currentIds);
      nextIds.add(criteriaId);
      return nextIds;
    });
    setDoctorBiasListErrors((currentErrors) => {
      const nextErrors = { ...currentErrors };
      delete nextErrors[criteriaId];
      return nextErrors;
    });

    try {
      const doctorBiasList =
        await biasCriteriaManagementService.getDoctorsByBiasForCriteria({
          criteriaId,
          currentMonth: getCurrentBiasMonth()
        });

      setDoctorBiasListsByCriteriaId((currentLists) => ({
        ...currentLists,
        [criteriaId]: doctorBiasList
      }));
    } catch (error) {
      setDoctorBiasListErrors((currentErrors) => ({
        ...currentErrors,
        [criteriaId]: getAdminOperationErrorMessage(
          error,
          "Unable to load doctor bias data."
        )
      }));
    } finally {
      setLoadingDoctorBiasCriteriaIds((currentIds) => {
        const nextIds = new Set(currentIds);
        nextIds.delete(criteriaId);
        return nextIds;
      });
    }
  }

  function handleCriteriaCardClick(criteriaId: string) {
    if (expandedCriteriaId === criteriaId) {
      setExpandedCriteriaId(null);
      return;
    }

    beginEditCriteria(criteriaId);
    setExpandedCriteriaId(criteriaId);

    if (
      !doctorBiasListsByCriteriaId[criteriaId] &&
      doctorBiasListErrors[criteriaId] === undefined
    ) {
      void loadDoctorBiasList(criteriaId);
    }
  }

  function retryDoctorBiasList(criteriaId: string) {
    void loadDoctorBiasList(criteriaId, true);
  }

  function updateTextField(field: "code" | "label", value: string) {
    setFormValues((currentValues) => ({
      ...currentValues,
      [field]: value
    }));
    setFieldErrors((currentErrors) => ({
      ...currentErrors,
      [field]: undefined
    }));
  }

  function toggleLocation(locationId: string) {
    setFormValues((currentValues) => ({
      ...currentValues,
      locationIds: dedupeIds(toggleListValue(currentValues.locationIds, locationId))
    }));
  }

  function toggleShiftType(shiftTypeId: string) {
    setFormValues((currentValues) => ({
      ...currentValues,
      shiftTypeIds: dedupeIds(toggleListValue(currentValues.shiftTypeIds, shiftTypeId))
    }));
  }

  function setWeekdays(days: ReadonlyArray<DayOfWeek>) {
    setFormValues((currentValues) => {
      const weekdayConditions = sortDays(days);
      const nextIsWeekendOnly =
        currentValues.isWeekendOnly &&
        (weekdayConditions.includes("SAT") || weekdayConditions.includes("SUN"));

      return {
        ...currentValues,
        weekdayConditions,
        isWeekendOnly: nextIsWeekendOnly
      };
    });
    setFieldErrors((currentErrors) => ({
      ...currentErrors,
      weekdayConditions: undefined,
      isWeekendOnly: undefined
    }));
  }

  function toggleWeekday(day: DayOfWeek) {
    setWeekdays(toggleListValue(formValues.weekdayConditions, day));
  }

  function setWeekendOnly(isWeekendOnly: boolean) {
    setFormValues((currentValues) => ({
      ...currentValues,
      isWeekendOnly
    }));
    setFieldErrors((currentErrors) => ({
      ...currentErrors,
      weekdayConditions: undefined,
      isWeekendOnly: undefined
    }));
  }

  function cancelEditing() {
    clearMessages();
    clearFieldErrors();

    if (selectedCriteria) {
      setFormMode("edit");
      setFormValues(createFormValuesFromCriteria(selectedCriteria));
      return;
    }

    setFormMode("create");
    setFormValues(createEmptyBiasCriteriaFormValues());
  }

  async function runAction(
    action: Exclude<BiasCriteriaAction, null>,
    work: () => Promise<void>
  ) {
    setActiveAction(action);
    setErrorMessage(null);
    setSuccessMessage(null);
    clearFieldErrors();

    try {
      await work();
    } catch (error) {
      if (error instanceof BiasCriteriaValidationError) {
        setFieldErrors(error.fieldErrors);
        setErrorMessage("Please fix the highlighted bias criteria fields.");
      } else {
        setErrorMessage(
          getAdminOperationErrorMessage(error, "Bias criteria action failed.")
        );
      }
    } finally {
      setActiveAction(null);
    }
  }

  async function saveCriteria() {
    if (!user || !role) {
      setErrorMessage("Admin identity is required to manage bias criteria.");
      return;
    }

    await runAction("save", async () => {
      if (formMode === "create") {
        const createdCriteria =
          await biasCriteriaManagementService.createCriteria({
            ...formValues,
            actorId: user.id,
            actorRole: role
          });

        await loadData(createdCriteria.id);
        setSuccessMessage(`Created ${createdCriteria.label}.`);
        return;
      }

      if (!selectedCriteria) {
        throw new Error("Select a bias criteria record before saving edits.");
      }

      const updatedCriteria = await biasCriteriaManagementService.updateCriteria({
        id: selectedCriteria.id,
        ...formValues,
        isActive: selectedCriteria.isActive,
        actorId: user.id,
        actorRole: role
      });

      await loadData(updatedCriteria.id);
      setSuccessMessage(`Updated ${updatedCriteria.label}.`);
    });
  }

  async function toggleCriteriaStatus() {
    if (!user || !role || !selectedCriteria) {
      setErrorMessage("Select a bias criteria record before changing status.");
      return;
    }

    await runAction("status", async () => {
      const updatedCriteria =
        await biasCriteriaManagementService.toggleCriteriaActive({
          id: selectedCriteria.id,
          isActive: !selectedCriteria.isActive,
          actorId: user.id,
          actorRole: role
        });

      await loadData(updatedCriteria.id);
      setSuccessMessage(
        updatedCriteria.isActive
          ? `${updatedCriteria.label} is now active.`
          : `${updatedCriteria.label} is now inactive.`
      );
    });
  }

  async function deleteCriteria() {
    if (!user || !role || !selectedCriteria) {
      setErrorMessage("Select a bias criteria record before deleting.");
      return;
    }

    await runAction("delete", async () => {
      await biasCriteriaManagementService.deleteCriteria({
        id: selectedCriteria.id,
        actorId: user.id,
        actorRole: role
      });
      const deletedLabel = selectedCriteria.label;
      await loadData(null);
      setSuccessMessage(`Deleted ${deletedLabel}.`);
    });
  }

  async function toggleCriteriaLock() {
    if (!user || !role || !selectedCriteria) {
      setErrorMessage("Select a bias criteria record before changing lock state.");
      return;
    }

    await runAction("lock", async () => {
      const updatedCriteria =
        await biasCriteriaManagementService.toggleCriteriaLock({
          id: selectedCriteria.id,
          isLocked: !selectedCriteria.isLocked,
          actorId: user.id,
          actorRole: role
        });

      await loadData(updatedCriteria.id);
      setSuccessMessage(
        updatedCriteria.isLocked
          ? `${updatedCriteria.label} is now locked.`
          : `${updatedCriteria.label} is now unlocked.`
      );
    });
  }

  return {
    criteriaEntries,
    locations,
    shiftTypes,
    selectedCriteria,
    selectedCriteriaId,
    expandedCriteriaId,
    doctorBiasListsByCriteriaId,
    loadingDoctorBiasCriteriaIds,
    doctorBiasListErrors,
    formMode,
    formValues,
    fieldErrors,
    previewText,
    isLoading,
    activeAction,
    errorMessage,
    successMessage,
    beginCreateCriteria,
    beginEditCriteria,
    handleCriteriaCardClick,
    retryDoctorBiasList,
    updateTextField,
    toggleLocation,
    toggleShiftType,
    setWeekdays,
    toggleWeekday,
    setWeekendOnly,
    cancelEditing,
    saveCriteria,
    toggleCriteriaStatus,
    deleteCriteria,
    toggleCriteriaLock
  };
}
