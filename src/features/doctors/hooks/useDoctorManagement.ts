import { useEffect, useState } from "react";
import type { Doctor, DoctorGroup } from "@/domain/models";
import { useAppServices } from "@/app/providers/useAppServices";
import { useAuth } from "@/features/auth/context/AuthContext";

export interface DoctorFormValues {
  readonly name: string;
  readonly phoneNumber: string;
  readonly uniqueIdentifier: string;
  readonly groupId: string;
  readonly newGroupName: string;
  readonly temporaryPassword: string;
}

type FormMode = "create" | "edit";
type DoctorAction = "save" | "delete" | "status" | "group" | null;

function createEmptyDoctorFormValues(): DoctorFormValues {
  return {
    name: "",
    phoneNumber: "",
    uniqueIdentifier: "",
    groupId: "",
    newGroupName: "",
    temporaryPassword: ""
  };
}

function createDoctorFormValuesFromDoctor(doctor: Doctor): DoctorFormValues {
  return {
    name: doctor.name,
    phoneNumber: doctor.phoneNumber,
    uniqueIdentifier: doctor.uniqueIdentifier,
    groupId: doctor.groupId ?? "",
    newGroupName: "",
    temporaryPassword: ""
  };
}

export function useDoctorManagement() {
  const { doctorManagementService, doctorGroupManagementService } = useAppServices();
  const { user, role } = useAuth();
  const [doctors, setDoctors] = useState<ReadonlyArray<Doctor>>([]);
  const [doctorGroups, setDoctorGroups] = useState<ReadonlyArray<DoctorGroup>>([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState<string | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [formMode, setFormMode] = useState<FormMode>("create");
  const [formValues, setFormValues] = useState<DoctorFormValues>(
    createEmptyDoctorFormValues()
  );
  const [isLoading, setIsLoading] = useState(true);
  const [activeAction, setActiveAction] = useState<DoctorAction>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const selectedDoctor =
    doctors.find((doctor) => doctor.id === selectedDoctorId) ?? null;

  async function loadData(nextSelectedDoctorId?: string | null) {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const [nextDoctors, nextDoctorGroups] = await Promise.all([
        doctorManagementService.listDoctors(),
        doctorGroupManagementService.listDoctorGroups()
      ]);

      setDoctors(nextDoctors);
      setDoctorGroups(nextDoctorGroups);

      const resolvedSelectedDoctorId =
        nextSelectedDoctorId === undefined ? selectedDoctorId : nextSelectedDoctorId;
      const nextSelectedDoctor =
        resolvedSelectedDoctorId === null
          ? null
          : nextDoctors.find((doctor) => doctor.id === resolvedSelectedDoctorId) ?? null;

      setSelectedDoctorId(nextSelectedDoctor?.id ?? null);

      if (isEditorOpen && formMode === "edit") {
        if (nextSelectedDoctor) {
          setFormValues(createDoctorFormValuesFromDoctor(nextSelectedDoctor));
        } else {
          setIsEditorOpen(false);
          setFormMode("create");
          setFormValues(createEmptyDoctorFormValues());
        }
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to load doctors."
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadData(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doctorManagementService, doctorGroupManagementService]);

  function clearMessages() {
    setErrorMessage(null);
    setSuccessMessage(null);
  }

  function selectDoctor(doctorId: string) {
    clearMessages();
    setSelectedDoctorId(doctorId);
  }

  function openCreateDoctor() {
    clearMessages();
    setFormMode("create");
    setFormValues(createEmptyDoctorFormValues());
    setIsEditorOpen(true);
  }

  function openEditDoctor() {
    if (!selectedDoctor) {
      setErrorMessage("Select a doctor before editing.");
      return;
    }

    clearMessages();
    setFormMode("edit");
    setFormValues(createDoctorFormValuesFromDoctor(selectedDoctor));
    setIsEditorOpen(true);
  }

  function updateFormValue<K extends keyof DoctorFormValues>(
    field: K,
    value: DoctorFormValues[K]
  ) {
    setFormValues((currentValues) => ({
      ...currentValues,
      [field]: value
    }));
  }

  function closeEditor() {
    clearMessages();
    setIsEditorOpen(false);
    setFormValues(
      selectedDoctor && formMode === "edit"
        ? createDoctorFormValuesFromDoctor(selectedDoctor)
        : createEmptyDoctorFormValues()
    );
  }

  async function runAction(
    action: Exclude<DoctorAction, null>,
    work: () => Promise<void>
  ) {
    setActiveAction(action);
    clearMessages();

    try {
      await work();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Doctor action failed."
      );
    } finally {
      setActiveAction(null);
    }
  }

  async function createGroupFromForm() {
    if (!user || !role) {
      setErrorMessage("Admin identity is required to manage doctor groups.");
      return;
    }

    await runAction("group", async () => {
      const savedGroup = await doctorGroupManagementService.createDoctorGroup({
        name: formValues.newGroupName,
        actorId: user.id,
        actorRole: role
      });

      await loadData(selectedDoctorId);
      setFormValues((currentValues) => ({
        ...currentValues,
        groupId: savedGroup.id,
        newGroupName: ""
      }));
      setSuccessMessage(`Created group ${savedGroup.name}.`);
    });
  }

  async function saveDoctor() {
    if (!user || !role) {
      setErrorMessage("Admin identity is required to manage doctors.");
      return;
    }

    await runAction("save", async () => {
      if (formMode === "create") {
        const savedDoctor = await doctorManagementService.createDoctor({
          name: formValues.name,
          phoneNumber: formValues.phoneNumber,
          uniqueIdentifier: formValues.uniqueIdentifier,
          groupId: formValues.groupId || undefined,
          temporaryPassword: formValues.temporaryPassword,
          actorId: user.id,
          actorRole: role
        });

        await loadData(savedDoctor.id);
        setIsEditorOpen(false);
        setFormValues(createEmptyDoctorFormValues());
        setSuccessMessage(`Created ${savedDoctor.name}.`);
        return;
      }

      if (!selectedDoctor) {
        throw new Error("Select a doctor before saving edits.");
      }

      const updatedDoctor = await doctorManagementService.updateDoctor(
        selectedDoctor.id,
        {
          name: formValues.name,
          phoneNumber: formValues.phoneNumber,
          uniqueIdentifier: formValues.uniqueIdentifier,
          groupId: formValues.groupId || undefined,
          temporaryPassword: formValues.temporaryPassword || undefined,
          actorId: user.id,
          actorRole: role
        }
      );

      await loadData(updatedDoctor.id);
      setIsEditorOpen(false);
      setSuccessMessage(`Updated ${updatedDoctor.name}.`);
    });
  }

  async function toggleDoctorStatus() {
    if (!user || !role || !selectedDoctor) {
      setErrorMessage("Select a doctor before changing active status.");
      return;
    }

    await runAction("status", async () => {
      const updatedDoctor = selectedDoctor.isActive
        ? await doctorManagementService.deactivateDoctor(selectedDoctor.id, {
            actorId: user.id,
            actorRole: role
          })
        : await doctorManagementService.activateDoctor(selectedDoctor.id, {
            actorId: user.id,
            actorRole: role
          });

      await loadData(updatedDoctor.id);
      setIsEditorOpen(false);
      setSuccessMessage(
        updatedDoctor.isActive
          ? `${updatedDoctor.name} is now active.`
          : `${updatedDoctor.name} is now inactive.`
      );
    });
  }

  async function deleteDoctor() {
    if (!user || !role || !selectedDoctor) {
      setErrorMessage("Select a doctor before deleting.");
      return;
    }

    await runAction("delete", async () => {
      await doctorManagementService.deleteDoctor(selectedDoctor.id, {
        actorId: user.id,
        actorRole: role
      });
      const deletedDoctorName = selectedDoctor.name;
      await loadData(null);
      setIsEditorOpen(false);
      setSuccessMessage(`Deleted ${deletedDoctorName}.`);
    });
  }

  return {
    doctors,
    doctorGroups,
    selectedDoctor,
    selectedDoctorId,
    isEditorOpen,
    formMode,
    formValues,
    isLoading,
    activeAction,
    errorMessage,
    successMessage,
    selectDoctor,
    openCreateDoctor,
    openEditDoctor,
    updateFormValue,
    closeEditor,
    createGroupFromForm,
    saveDoctor,
    toggleDoctorStatus,
    deleteDoctor
  };
}
