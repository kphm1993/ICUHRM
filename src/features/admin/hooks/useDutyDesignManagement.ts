import { useEffect, useState } from "react";
import type {
  DutyDesign,
  DutyLocation,
  ShiftType
} from "@/domain/models";
import { useAppServices } from "@/app/providers/useAppServices";
import { useAuth } from "@/features/auth/context/AuthContext";
import { getAdminOperationErrorMessage } from "@/features/admin/services/adminOperationErrorMessage";
import { DutyDesignValidationError } from "@/features/dutyDesigns/services/dutyDesignManagementValidation";

export interface DutyDesignBlockFormValue {
  readonly rowId: string;
  readonly shiftTypeId: string;
  readonly locationId: string;
  readonly doctorCount: string;
  readonly offOffsetDays: string;
  readonly followUpDutyDesignId: string;
}

export interface DutyDesignFormValues {
  readonly code: string;
  readonly label: string;
  readonly description: string;
  readonly isHolidayDesign: boolean;
  readonly isActive: boolean;
  readonly dutyBlocks: ReadonlyArray<DutyDesignBlockFormValue>;
}

export interface DutyDesignFormFieldErrors {
  readonly code?: string;
  readonly label?: string;
  readonly dutyBlocks?: string;
}

type DutyDesignFormMode = "create" | "edit";
type DutyDesignAction = "save" | "delete" | "status" | null;

function createDutyBlockFormValue(): DutyDesignBlockFormValue {
  return {
    rowId: crypto.randomUUID(),
    shiftTypeId: "",
    locationId: "",
    doctorCount: "1",
    offOffsetDays: "",
    followUpDutyDesignId: ""
  };
}

function createEmptyDutyDesignFormValues(): DutyDesignFormValues {
  return {
    code: "",
    label: "",
    description: "",
    isHolidayDesign: false,
    isActive: true,
    dutyBlocks: [createDutyBlockFormValue()]
  };
}

function createFormValuesFromDutyDesign(
  dutyDesign: DutyDesign
): DutyDesignFormValues {
  return {
    code: dutyDesign.code,
    label: dutyDesign.label,
    description: dutyDesign.description ?? "",
    isHolidayDesign: dutyDesign.isHolidayDesign,
    isActive: dutyDesign.isActive,
    dutyBlocks: dutyDesign.dutyBlocks.map((block) => ({
      rowId: crypto.randomUUID(),
      shiftTypeId: block.shiftTypeId,
      locationId: block.locationId ?? "",
      doctorCount: String(block.doctorCount),
      offOffsetDays:
        block.offOffsetDays === undefined ? "" : String(block.offOffsetDays),
      followUpDutyDesignId: block.followUpDutyDesignId ?? ""
    }))
  };
}

function mapDutyBlocksForSave(values: ReadonlyArray<DutyDesignBlockFormValue>) {
  return values.map((block) => ({
    shiftTypeId: block.shiftTypeId,
    locationId: block.locationId || undefined,
    doctorCount: Number(block.doctorCount),
    offOffsetDays:
      block.offOffsetDays.trim().length === 0
        ? undefined
        : Number(block.offOffsetDays),
    followUpDutyDesignId: block.followUpDutyDesignId || undefined
  }));
}

export function useDutyDesignManagement() {
  const {
    dutyDesignManagementService,
    dutyLocationManagementService,
    shiftTypeManagementService
  } = useAppServices();
  const { user, role } = useAuth();
  const [dutyDesigns, setDutyDesigns] = useState<ReadonlyArray<DutyDesign>>([]);
  const [locations, setLocations] = useState<ReadonlyArray<DutyLocation>>([]);
  const [shiftTypes, setShiftTypes] = useState<ReadonlyArray<ShiftType>>([]);
  const [selectedDutyDesignId, setSelectedDutyDesignId] = useState<string | null>(
    null
  );
  const [expandedDutyDesignId, setExpandedDutyDesignId] = useState<string | null>(
    null
  );
  const [formMode, setFormMode] = useState<DutyDesignFormMode>("create");
  const [formValues, setFormValues] = useState<DutyDesignFormValues>(
    createEmptyDutyDesignFormValues()
  );
  const [fieldErrors, setFieldErrors] = useState<DutyDesignFormFieldErrors>({});
  const [isLoading, setIsLoading] = useState(true);
  const [activeAction, setActiveAction] = useState<DutyDesignAction>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const selectedDutyDesign =
    dutyDesigns.find((design) => design.id === selectedDutyDesignId) ?? null;

  async function loadData(nextSelectedDutyDesignId?: string | null) {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const [nextDutyDesigns, nextLocations, nextShiftTypes] = await Promise.all([
        dutyDesignManagementService.listDutyDesigns(),
        dutyLocationManagementService.getLocationList(),
        shiftTypeManagementService.listShiftTypes()
      ]);

      setDutyDesigns(nextDutyDesigns);
      setLocations(nextLocations);
      setShiftTypes(nextShiftTypes);

      const resolvedSelectedDutyDesignId =
        nextSelectedDutyDesignId === undefined
          ? selectedDutyDesignId
          : nextSelectedDutyDesignId;
      const nextSelectedDutyDesign =
        resolvedSelectedDutyDesignId === null
          ? null
          : nextDutyDesigns.find(
              (design) => design.id === resolvedSelectedDutyDesignId
            ) ?? null;

      if (nextSelectedDutyDesign) {
        setSelectedDutyDesignId(nextSelectedDutyDesign.id);
        setFormMode("edit");
        setFormValues(createFormValuesFromDutyDesign(nextSelectedDutyDesign));
      } else {
        setSelectedDutyDesignId(null);
        setFormMode("create");
        setFormValues(createEmptyDutyDesignFormValues());
      }

      setExpandedDutyDesignId((currentExpandedDutyDesignId) => {
        if (currentExpandedDutyDesignId === null) {
          return null;
        }

        return nextDutyDesigns.some(
          (design) => design.id === currentExpandedDutyDesignId
        )
          ? currentExpandedDutyDesignId
          : null;
      });
    } catch (error) {
      setErrorMessage(
        getAdminOperationErrorMessage(error, "Unable to load duty designs.")
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadData(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    dutyDesignManagementService,
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

  function beginCreateDutyDesign() {
    clearMessages();
    clearFieldErrors();
    setSelectedDutyDesignId(null);
    setExpandedDutyDesignId(null);
    setFormMode("create");
    setFormValues(createEmptyDutyDesignFormValues());
  }

  function beginEditDutyDesign(dutyDesignId: string) {
    const dutyDesign = dutyDesigns.find((entry) => entry.id === dutyDesignId);

    if (!dutyDesign) {
      return;
    }

    clearMessages();
    clearFieldErrors();
    setSelectedDutyDesignId(dutyDesign.id);
    setFormMode("edit");
    setFormValues(createFormValuesFromDutyDesign(dutyDesign));
  }

  function handleDutyDesignCardClick(dutyDesignId: string) {
    if (expandedDutyDesignId === dutyDesignId) {
      setExpandedDutyDesignId(null);
      return;
    }

    beginEditDutyDesign(dutyDesignId);
    setExpandedDutyDesignId(dutyDesignId);
  }

  function updateTextField(
    field: "code" | "label" | "description",
    value: string
  ) {
    setFormValues((currentValues) => ({
      ...currentValues,
      [field]: value
    }));
    setFieldErrors((currentErrors) => ({
      ...currentErrors,
      [field]: undefined
    }));
  }

  function setBooleanField(
    field: "isHolidayDesign" | "isActive",
    value: boolean
  ) {
    setFormValues((currentValues) => ({
      ...currentValues,
      [field]: value
    }));
  }

  function addDutyBlockRow() {
    setFormValues((currentValues) => ({
      ...currentValues,
      dutyBlocks: [...currentValues.dutyBlocks, createDutyBlockFormValue()]
    }));
    setFieldErrors((currentErrors) => ({
      ...currentErrors,
      dutyBlocks: undefined
    }));
  }

  function removeDutyBlockRow(rowId: string) {
    setFormValues((currentValues) => ({
      ...currentValues,
      dutyBlocks: currentValues.dutyBlocks.filter((block) => block.rowId !== rowId)
    }));
    setFieldErrors((currentErrors) => ({
      ...currentErrors,
      dutyBlocks: undefined
    }));
  }

  function updateDutyBlockRow(
    rowId: string,
    field: Exclude<keyof DutyDesignBlockFormValue, "rowId">,
    value: string
  ) {
    setFormValues((currentValues) => ({
      ...currentValues,
      dutyBlocks: currentValues.dutyBlocks.map((block) =>
        block.rowId === rowId
          ? {
              ...block,
              [field]: value
            }
          : block
      )
    }));
    setFieldErrors((currentErrors) => ({
      ...currentErrors,
      dutyBlocks: undefined
    }));
  }

  function cancelEditing() {
    clearMessages();
    clearFieldErrors();

    if (selectedDutyDesign) {
      setFormMode("edit");
      setFormValues(createFormValuesFromDutyDesign(selectedDutyDesign));
      return;
    }

    setFormMode("create");
    setFormValues(createEmptyDutyDesignFormValues());
  }

  async function runAction(
    action: Exclude<DutyDesignAction, null>,
    work: () => Promise<void>
  ) {
    setActiveAction(action);
    setErrorMessage(null);
    setSuccessMessage(null);
    clearFieldErrors();

    try {
      await work();
    } catch (error) {
      if (error instanceof DutyDesignValidationError) {
        setFieldErrors(error.fieldErrors);
        setErrorMessage("Please fix the highlighted duty design fields.");
      } else {
        setErrorMessage(
          getAdminOperationErrorMessage(error, "Duty design action failed.")
        );
      }
    } finally {
      setActiveAction(null);
    }
  }

  async function saveDutyDesign() {
    if (!user || !role) {
      setErrorMessage("Admin identity is required to manage duty designs.");
      return;
    }

    await runAction("save", async () => {
      if (formMode === "create") {
        const createdDutyDesign = await dutyDesignManagementService.createDutyDesign({
          code: formValues.code,
          label: formValues.label,
          description: formValues.description,
          isHolidayDesign: formValues.isHolidayDesign,
          isActive: formValues.isActive,
          dutyBlocks: mapDutyBlocksForSave(formValues.dutyBlocks),
          actorId: user.id,
          actorRole: role
        });

        await loadData(createdDutyDesign.id);
        setSuccessMessage(`Created ${createdDutyDesign.label}.`);
        return;
      }

      if (!selectedDutyDesign) {
        throw new Error("Select a duty design before saving edits.");
      }

      const updatedDutyDesign = await dutyDesignManagementService.updateDutyDesign({
        id: selectedDutyDesign.id,
        code: formValues.code,
        label: formValues.label,
        description: formValues.description,
        isHolidayDesign: formValues.isHolidayDesign,
        isActive: formValues.isActive,
        dutyBlocks: mapDutyBlocksForSave(formValues.dutyBlocks),
        actorId: user.id,
        actorRole: role
      });

      await loadData(updatedDutyDesign.id);
      setSuccessMessage(`Updated ${updatedDutyDesign.label}.`);
    });
  }

  async function toggleDutyDesignStatus() {
    if (!user || !role || !selectedDutyDesign) {
      setErrorMessage("Select a duty design before changing status.");
      return;
    }

    await runAction("status", async () => {
      const updatedDutyDesign = await dutyDesignManagementService.updateDutyDesign({
        id: selectedDutyDesign.id,
        code: selectedDutyDesign.code,
        label: selectedDutyDesign.label,
        description: selectedDutyDesign.description,
        isHolidayDesign: selectedDutyDesign.isHolidayDesign,
        isActive: !selectedDutyDesign.isActive,
        dutyBlocks: selectedDutyDesign.dutyBlocks.map((block) => ({
          shiftTypeId: block.shiftTypeId,
          locationId: block.locationId,
          doctorCount: block.doctorCount,
          offOffsetDays: block.offOffsetDays,
          followUpDutyDesignId: block.followUpDutyDesignId
        })),
        actorId: user.id,
        actorRole: role
      });

      await loadData(updatedDutyDesign.id);
      setSuccessMessage(
        updatedDutyDesign.isActive
          ? `${updatedDutyDesign.label} is now active.`
          : `${updatedDutyDesign.label} is now inactive.`
      );
    });
  }

  async function deleteDutyDesign() {
    if (!user || !role || !selectedDutyDesign) {
      setErrorMessage("Select a duty design before deleting.");
      return;
    }

    await runAction("delete", async () => {
      await dutyDesignManagementService.deleteDutyDesign({
        id: selectedDutyDesign.id,
        actorId: user.id,
        actorRole: role
      });
      const deletedLabel = selectedDutyDesign.label;
      await loadData(null);
      setSuccessMessage(`Deleted ${deletedLabel}.`);
    });
  }

  return {
    dutyDesigns,
    locations,
    shiftTypes,
    selectedDutyDesign,
    selectedDutyDesignId,
    expandedDutyDesignId,
    formMode,
    formValues,
    fieldErrors,
    isLoading,
    activeAction,
    errorMessage,
    successMessage,
    beginCreateDutyDesign,
    handleDutyDesignCardClick,
    updateTextField,
    setBooleanField,
    addDutyBlockRow,
    removeDutyBlockRow,
    updateDutyBlockRow,
    cancelEditing,
    saveDutyDesign,
    toggleDutyDesignStatus,
    deleteDutyDesign
  };
}
