import { useEffect, useState } from "react";
import type { ShiftKind, ShiftType } from "@/domain/models";
import { useAppServices } from "@/app/providers/useAppServices";
import { useAuth } from "@/features/auth/context/AuthContext";
import { getAdminOperationErrorMessage } from "@/features/admin/services/adminOperationErrorMessage";
import { ShiftTypeValidationError } from "@/features/shifts/services/shiftTypeManagementValidation";

export interface ShiftTypeFormValues {
  readonly code: string;
  readonly label: string;
  readonly startTime: string;
  readonly endTime: string;
  readonly category: ShiftKind;
  readonly isActive: boolean;
}

export interface ShiftTypeFormFieldErrors {
  readonly code?: string;
  readonly label?: string;
  readonly startTime?: string;
  readonly endTime?: string;
}

type ShiftTypeFormMode = "create" | "edit";
type ShiftTypeAction = "save" | "delete" | "status" | null;

function createEmptyShiftTypeFormValues(): ShiftTypeFormValues {
  return {
    code: "",
    label: "",
    startTime: "08:00",
    endTime: "20:00",
    category: "DAY",
    isActive: true
  };
}

function createFormValuesFromShiftType(
  shiftType: ShiftType
): ShiftTypeFormValues {
  return {
    code: shiftType.code,
    label: shiftType.label,
    startTime: shiftType.startTime,
    endTime: shiftType.endTime,
    category: shiftType.category,
    isActive: shiftType.isActive
  };
}

export function useShiftTypeManagement() {
  const { shiftTypeManagementService } = useAppServices();
  const { user, role } = useAuth();
  const [shiftTypes, setShiftTypes] = useState<ReadonlyArray<ShiftType>>([]);
  const [selectedShiftTypeId, setSelectedShiftTypeId] = useState<string | null>(null);
  const [expandedShiftTypeId, setExpandedShiftTypeId] = useState<string | null>(null);
  const [formMode, setFormMode] = useState<ShiftTypeFormMode>("create");
  const [formValues, setFormValues] = useState<ShiftTypeFormValues>(
    createEmptyShiftTypeFormValues()
  );
  const [fieldErrors, setFieldErrors] = useState<ShiftTypeFormFieldErrors>({});
  const [isLoading, setIsLoading] = useState(true);
  const [activeAction, setActiveAction] = useState<ShiftTypeAction>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const selectedShiftType =
    shiftTypes.find((shiftType) => shiftType.id === selectedShiftTypeId) ?? null;

  async function loadShiftTypes(nextSelectedShiftTypeId?: string | null) {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const nextShiftTypes = await shiftTypeManagementService.listShiftTypes();
      setShiftTypes(nextShiftTypes);

      const resolvedSelectedShiftTypeId =
        nextSelectedShiftTypeId === undefined
          ? selectedShiftTypeId
          : nextSelectedShiftTypeId;
      const nextSelectedShiftType =
        resolvedSelectedShiftTypeId === null
          ? null
          : nextShiftTypes.find(
              (shiftType) => shiftType.id === resolvedSelectedShiftTypeId
            ) ?? null;

      if (nextSelectedShiftType) {
        setSelectedShiftTypeId(nextSelectedShiftType.id);
        setFormMode("edit");
        setFormValues(createFormValuesFromShiftType(nextSelectedShiftType));
      } else {
        setSelectedShiftTypeId(null);
        setFormMode("create");
        setFormValues(createEmptyShiftTypeFormValues());
      }

      setExpandedShiftTypeId((currentExpandedShiftTypeId) => {
        if (currentExpandedShiftTypeId === null) {
          return null;
        }

        return nextShiftTypes.some(
          (shiftType) => shiftType.id === currentExpandedShiftTypeId
        )
          ? currentExpandedShiftTypeId
          : null;
      });
    } catch (error) {
      setErrorMessage(
        getAdminOperationErrorMessage(error, "Unable to load shift types.")
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadShiftTypes(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shiftTypeManagementService]);

  function clearMessages() {
    setErrorMessage(null);
    setSuccessMessage(null);
  }

  function clearFieldErrors() {
    setFieldErrors({});
  }

  function beginCreateShiftType() {
    clearMessages();
    clearFieldErrors();
    setSelectedShiftTypeId(null);
    setExpandedShiftTypeId(null);
    setFormMode("create");
    setFormValues(createEmptyShiftTypeFormValues());
  }

  function beginEditShiftType(shiftTypeId: string) {
    const shiftType = shiftTypes.find((entry) => entry.id === shiftTypeId);

    if (!shiftType) {
      return;
    }

    clearMessages();
    clearFieldErrors();
    setSelectedShiftTypeId(shiftType.id);
    setFormMode("edit");
    setFormValues(createFormValuesFromShiftType(shiftType));
  }

  function handleShiftTypeCardClick(shiftTypeId: string) {
    if (expandedShiftTypeId === shiftTypeId) {
      setExpandedShiftTypeId(null);
      return;
    }

    beginEditShiftType(shiftTypeId);
    setExpandedShiftTypeId(shiftTypeId);
  }

  function updateTextField(
    field: "code" | "label" | "startTime" | "endTime",
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

  function setCategory(category: ShiftKind) {
    setFormValues((currentValues) => ({
      ...currentValues,
      category
    }));
  }

  function setIsActive(isActive: boolean) {
    setFormValues((currentValues) => ({
      ...currentValues,
      isActive
    }));
  }

  function cancelEditing() {
    clearMessages();
    clearFieldErrors();

    if (selectedShiftType) {
      setFormMode("edit");
      setFormValues(createFormValuesFromShiftType(selectedShiftType));
      return;
    }

    setFormMode("create");
    setFormValues(createEmptyShiftTypeFormValues());
  }

  async function runAction(
    action: Exclude<ShiftTypeAction, null>,
    work: () => Promise<void>
  ) {
    setActiveAction(action);
    setErrorMessage(null);
    setSuccessMessage(null);
    clearFieldErrors();

    try {
      await work();
    } catch (error) {
      if (error instanceof ShiftTypeValidationError) {
        setFieldErrors(error.fieldErrors);
        setErrorMessage("Please fix the highlighted shift type fields.");
      } else {
        setErrorMessage(
          getAdminOperationErrorMessage(error, "Shift type action failed.")
        );
      }
    } finally {
      setActiveAction(null);
    }
  }

  async function saveShiftType() {
    if (!user || !role) {
      setErrorMessage("Admin identity is required to manage shift types.");
      return;
    }

    await runAction("save", async () => {
      if (formMode === "create") {
        const createdShiftType = await shiftTypeManagementService.createShiftType({
          ...formValues,
          actorId: user.id,
          actorRole: role
        });

        await loadShiftTypes(createdShiftType.id);
        setSuccessMessage(`Created ${createdShiftType.label}.`);
        return;
      }

      if (!selectedShiftType) {
        throw new Error("Select a shift type before saving edits.");
      }

      const updatedShiftType = await shiftTypeManagementService.updateShiftType({
        id: selectedShiftType.id,
        ...formValues,
        actorId: user.id,
        actorRole: role
      });

      await loadShiftTypes(updatedShiftType.id);
      setSuccessMessage(`Updated ${updatedShiftType.label}.`);
    });
  }

  async function toggleShiftTypeStatus() {
    if (!user || !role || !selectedShiftType) {
      setErrorMessage("Select a shift type before changing status.");
      return;
    }

    await runAction("status", async () => {
      const updatedShiftType = await shiftTypeManagementService.updateShiftType({
        id: selectedShiftType.id,
        code: selectedShiftType.code,
        label: selectedShiftType.label,
        startTime: selectedShiftType.startTime,
        endTime: selectedShiftType.endTime,
        category: selectedShiftType.category,
        isActive: !selectedShiftType.isActive,
        actorId: user.id,
        actorRole: role
      });

      await loadShiftTypes(updatedShiftType.id);
      setSuccessMessage(
        updatedShiftType.isActive
          ? `${updatedShiftType.label} is now active.`
          : `${updatedShiftType.label} is now inactive.`
      );
    });
  }

  async function deleteShiftType() {
    if (!user || !role || !selectedShiftType) {
      setErrorMessage("Select a shift type before deleting.");
      return;
    }

    await runAction("delete", async () => {
      await shiftTypeManagementService.deleteShiftType({
        id: selectedShiftType.id,
        actorId: user.id,
        actorRole: role
      });
      const deletedLabel = selectedShiftType.label;
      await loadShiftTypes(null);
      setSuccessMessage(`Deleted ${deletedLabel}.`);
    });
  }

  return {
    shiftTypes,
    selectedShiftType,
    selectedShiftTypeId,
    expandedShiftTypeId,
    formMode,
    formValues,
    fieldErrors,
    isLoading,
    activeAction,
    errorMessage,
    successMessage,
    beginCreateShiftType,
    handleShiftTypeCardClick,
    updateTextField,
    setCategory,
    setIsActive,
    cancelEditing,
    saveShiftType,
    toggleShiftTypeStatus,
    deleteShiftType
  };
}
