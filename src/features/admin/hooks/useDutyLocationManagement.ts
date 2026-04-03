import { useEffect, useState } from "react";
import type { DutyLocation } from "@/domain/models";
import { useAppServices } from "@/app/providers/useAppServices";
import { useAuth } from "@/features/auth/context/AuthContext";
import { getAdminOperationErrorMessage } from "@/features/admin/services/adminOperationErrorMessage";
import { DutyLocationValidationError } from "@/features/admin/services/dutyLocationManagementValidation";

export interface DutyLocationFormValues {
  readonly code: string;
  readonly label: string;
  readonly description: string;
}

export interface DutyLocationFormFieldErrors {
  readonly code?: string;
  readonly label?: string;
  readonly description?: string;
}

type FormMode = "create" | "edit";
type DutyLocationAction = "save" | "delete" | "status" | null;

function createEmptyDutyLocationFormValues(): DutyLocationFormValues {
  return {
    code: "",
    label: "",
    description: ""
  };
}

function createFormValuesFromLocation(
  location: DutyLocation
): DutyLocationFormValues {
  return {
    code: location.code,
    label: location.label,
    description: location.description ?? ""
  };
}

export function useDutyLocationManagement() {
  const { dutyLocationManagementService } = useAppServices();
  const { user, role } = useAuth();
  const [locations, setLocations] = useState<ReadonlyArray<DutyLocation>>([]);
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);
  const [formMode, setFormMode] = useState<FormMode>("create");
  const [formValues, setFormValues] = useState<DutyLocationFormValues>(
    createEmptyDutyLocationFormValues()
  );
  const [fieldErrors, setFieldErrors] = useState<DutyLocationFormFieldErrors>({});
  const [isLoading, setIsLoading] = useState(true);
  const [activeAction, setActiveAction] = useState<DutyLocationAction>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const selectedLocation =
    locations.find((location) => location.id === selectedLocationId) ?? null;

  async function loadLocations(nextSelectedLocationId?: string | null) {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const nextLocations = await dutyLocationManagementService.getLocationList();
      setLocations(nextLocations);

      const resolvedSelectedLocationId =
        nextSelectedLocationId === undefined
          ? selectedLocationId
          : nextSelectedLocationId;
      const nextSelectedLocation =
        resolvedSelectedLocationId === null
          ? null
          : nextLocations.find(
              (location) => location.id === resolvedSelectedLocationId
            ) ?? null;

      if (nextSelectedLocation) {
        setSelectedLocationId(nextSelectedLocation.id);
        setFormMode("edit");
        setFormValues(createFormValuesFromLocation(nextSelectedLocation));
      } else {
        setSelectedLocationId(null);
        setFormMode("create");
        setFormValues(createEmptyDutyLocationFormValues());
      }
    } catch (error) {
      setErrorMessage(
        getAdminOperationErrorMessage(error, "Unable to load duty locations.")
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadLocations(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dutyLocationManagementService]);

  function clearMessages() {
    setErrorMessage(null);
    setSuccessMessage(null);
  }

  function beginCreateLocation() {
    clearMessages();
    setFieldErrors({});
    setSelectedLocationId(null);
    setFormMode("create");
    setFormValues(createEmptyDutyLocationFormValues());
  }

  function beginEditLocation(locationId: string) {
    const location = locations.find((entry) => entry.id === locationId);

    if (!location) {
      return;
    }

    clearMessages();
    setFieldErrors({});
    setSelectedLocationId(location.id);
    setFormMode("edit");
    setFormValues(createFormValuesFromLocation(location));
  }

  function updateFormValue<K extends keyof DutyLocationFormValues>(
    field: K,
    value: DutyLocationFormValues[K]
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

  function cancelEditing() {
    clearMessages();
    setFieldErrors({});

    if (selectedLocation) {
      setFormMode("edit");
      setFormValues(createFormValuesFromLocation(selectedLocation));
      return;
    }

    setFormMode("create");
    setFormValues(createEmptyDutyLocationFormValues());
  }

  async function runAction(
    action: Exclude<DutyLocationAction, null>,
    work: () => Promise<void>
  ) {
    setActiveAction(action);
    setErrorMessage(null);
    setSuccessMessage(null);
    setFieldErrors({});

    try {
      await work();
    } catch (error) {
      if (error instanceof DutyLocationValidationError) {
        setFieldErrors(error.fieldErrors);
        setErrorMessage("Please fix the highlighted duty location fields.");
      } else {
        setErrorMessage(
          getAdminOperationErrorMessage(error, "Duty location action failed.")
        );
      }
    } finally {
      setActiveAction(null);
    }
  }

  async function saveLocation() {
    if (!user || !role) {
      setErrorMessage("Admin identity is required to manage duty locations.");
      return;
    }

    await runAction("save", async () => {
      if (formMode === "create") {
        const createdLocation = await dutyLocationManagementService.createLocation({
          ...formValues,
          actorId: user.id,
          actorRole: role
        });

        await loadLocations(createdLocation.id);
        setSuccessMessage(`Created ${createdLocation.label}.`);
        return;
      }

      if (!selectedLocation) {
        throw new Error("Select a duty location before saving edits.");
      }

      const updatedLocation = await dutyLocationManagementService.updateLocation({
        id: selectedLocation.id,
        ...formValues,
        isActive: selectedLocation.isActive,
        actorId: user.id,
        actorRole: role
      });

      await loadLocations(updatedLocation.id);
      setSuccessMessage(`Updated ${updatedLocation.label}.`);
    });
  }

  async function toggleLocationStatus() {
    if (!user || !role || !selectedLocation) {
      setErrorMessage("Select a duty location before changing status.");
      return;
    }

    await runAction("status", async () => {
      const updatedLocation = await dutyLocationManagementService.setLocationActive({
        id: selectedLocation.id,
        isActive: !selectedLocation.isActive,
        actorId: user.id,
        actorRole: role
      });

      await loadLocations(updatedLocation.id);
      setSuccessMessage(
        updatedLocation.isActive
          ? `${updatedLocation.label} is now active.`
          : `${updatedLocation.label} is now inactive.`
      );
    });
  }

  async function deleteLocation() {
    if (!user || !role || !selectedLocation) {
      setErrorMessage("Select a duty location before deleting.");
      return;
    }

    await runAction("delete", async () => {
      await dutyLocationManagementService.deleteLocation({
        id: selectedLocation.id,
        actorId: user.id,
        actorRole: role
      });
      const deletedLabel = selectedLocation.label;
      await loadLocations(null);
      setSuccessMessage(`Deleted ${deletedLabel}.`);
    });
  }

  return {
    locations,
    selectedLocation,
    selectedLocationId,
    formMode,
    formValues,
    fieldErrors,
    isLoading,
    activeAction,
    errorMessage,
    successMessage,
    beginCreateLocation,
    beginEditLocation,
    updateFormValue,
    cancelEditing,
    saveLocation,
    toggleLocationStatus,
    deleteLocation
  };
}
