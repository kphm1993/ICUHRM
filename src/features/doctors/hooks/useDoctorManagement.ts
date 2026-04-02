import { useEffect, useState } from "react";
import type {
  Doctor,
  WeekendGroup
} from "@/domain/models";
import { useAppServices } from "@/app/providers/useAppServices";
import { useAuth } from "@/features/auth/context/AuthContext";

export interface DoctorFormValues {
  readonly name: string;
  readonly phoneNumber: string;
  readonly uniqueIdentifier: string;
  readonly weekendGroup: WeekendGroup;
  readonly temporaryPassword: string;
}

type FormMode = "create" | "edit";
type DoctorAction = "save" | "delete" | "status" | null;

function createEmptyDoctorFormValues(): DoctorFormValues {
  return {
    name: "",
    phoneNumber: "",
    uniqueIdentifier: "",
    weekendGroup: "A",
    temporaryPassword: ""
  };
}

function createDoctorFormValuesFromDoctor(doctor: Doctor): DoctorFormValues {
  return {
    name: doctor.name,
    phoneNumber: doctor.phoneNumber,
    uniqueIdentifier: doctor.uniqueIdentifier,
    weekendGroup: doctor.weekendGroup,
    temporaryPassword: ""
  };
}

export function useDoctorManagement() {
  const { doctorManagementService } = useAppServices();
  const { user, role } = useAuth();
  const [doctors, setDoctors] = useState<ReadonlyArray<Doctor>>([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState<string | null>(null);
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

  async function loadDoctors(nextSelectedDoctorId?: string | null) {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const nextDoctors = await doctorManagementService.listDoctors();
      setDoctors(nextDoctors);

      const resolvedSelectedDoctorId =
        nextSelectedDoctorId === undefined ? selectedDoctorId : nextSelectedDoctorId;
      const nextSelectedDoctor =
        resolvedSelectedDoctorId === null
          ? null
          : nextDoctors.find((doctor) => doctor.id === resolvedSelectedDoctorId) ?? null;

      if (nextSelectedDoctor) {
        setSelectedDoctorId(nextSelectedDoctor.id);
        setFormMode("edit");
        setFormValues(createDoctorFormValuesFromDoctor(nextSelectedDoctor));
      } else {
        setSelectedDoctorId(null);
        setFormMode("create");
        setFormValues(createEmptyDoctorFormValues());
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
    void loadDoctors(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doctorManagementService]);

  function beginCreateDoctor() {
    setErrorMessage(null);
    setSuccessMessage(null);
    setSelectedDoctorId(null);
    setFormMode("create");
    setFormValues(createEmptyDoctorFormValues());
  }

  function beginEditDoctor(doctorId: string) {
    const doctor = doctors.find((entry) => entry.id === doctorId);

    if (!doctor) {
      return;
    }

    setErrorMessage(null);
    setSuccessMessage(null);
    setSelectedDoctorId(doctor.id);
    setFormMode("edit");
    setFormValues(createDoctorFormValuesFromDoctor(doctor));
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

  function cancelEditing() {
    setErrorMessage(null);
    setSuccessMessage(null);

    if (selectedDoctor) {
      setFormMode("edit");
      setFormValues(createDoctorFormValuesFromDoctor(selectedDoctor));
      return;
    }

    setFormMode("create");
    setFormValues(createEmptyDoctorFormValues());
  }

  async function runAction(
    action: Exclude<DoctorAction, null>,
    work: () => Promise<void>
  ) {
    setActiveAction(action);
    setErrorMessage(null);
    setSuccessMessage(null);

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

  async function saveDoctor() {
    if (!user || !role) {
      setErrorMessage("Admin identity is required to manage doctors.");
      return;
    }

    await runAction("save", async () => {
      if (formMode === "create") {
        const savedDoctor = await doctorManagementService.createDoctor({
          ...formValues,
          actorId: user.id,
          actorRole: role
        });

        await loadDoctors(savedDoctor.id);
        setSuccessMessage(`Created ${savedDoctor.name}.`);
        return;
      }

      if (!selectedDoctor) {
        throw new Error("Select a doctor before saving edits.");
      }

      const updatedDoctor = await doctorManagementService.updateDoctor(
        selectedDoctor.id,
        {
          ...formValues,
          actorId: user.id,
          actorRole: role
        }
      );

      await loadDoctors(updatedDoctor.id);
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

      await loadDoctors(updatedDoctor.id);
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
      await loadDoctors(null);
      setSuccessMessage(`Deleted ${deletedDoctorName}.`);
    });
  }

  return {
    doctors,
    selectedDoctor,
    selectedDoctorId,
    formMode,
    formValues,
    isLoading,
    activeAction,
    errorMessage,
    successMessage,
    beginCreateDoctor,
    beginEditDoctor,
    updateFormValue,
    cancelEditing,
    saveDoctor,
    toggleDoctorStatus,
    deleteDoctor
  };
}
