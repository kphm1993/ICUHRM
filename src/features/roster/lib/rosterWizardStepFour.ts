import type { EntityId } from "@/domain/models";
import type {
  RosterWizardStepFourCriteriaTab,
  RosterWizardStepFourDoctorCandidate,
  RosterWizardStepFourShiftPreview
} from "@/features/roster/services/rosterWizardService";

export function getRosterWizardStepFourSourceLabel(
  source: RosterWizardStepFourShiftPreview["source"]
): string {
  switch (source) {
    case "DUTY_DESIGN_HOLIDAY_OVERRIDE":
      return "Holiday override";
    case "DUTY_DESIGN_STANDARD":
      return "Duty design";
    default:
      return "Legacy fallback";
  }
}

export function formatRosterWizardStepFourBiasValue(value: number): string {
  const roundedValue = Math.round(value * 100) / 100;

  if (roundedValue === 0) {
    return "0";
  }

  return roundedValue > 0 ? `+${roundedValue}` : `${roundedValue}`;
}

export function getDefaultRosterWizardStepFourTabId(
  tabs: ReadonlyArray<RosterWizardStepFourCriteriaTab>,
  assignedDoctorId?: EntityId
): string {
  if (!assignedDoctorId) {
    return tabs[0]?.id ?? "overall-ranking";
  }

  const matchingAssignedTab = tabs.find((tab) =>
    tab.doctors.some((doctor) => doctor.doctorId === assignedDoctorId)
  );

  return matchingAssignedTab?.id ?? tabs[0]?.id ?? "overall-ranking";
}

export function sortRosterWizardStepFourDoctorChoices(
  doctors: ReadonlyArray<RosterWizardStepFourDoctorCandidate>
): ReadonlyArray<RosterWizardStepFourDoctorCandidate> {
  return [...doctors].sort((left, right) => {
    if (left.isEligible !== right.isEligible) {
      return left.isEligible ? -1 : 1;
    }

    if (left.biasValue !== right.biasValue) {
      return left.biasValue - right.biasValue;
    }

    const nameComparison = left.doctorName.localeCompare(right.doctorName);
    return nameComparison !== 0
      ? nameComparison
      : left.doctorId.localeCompare(right.doctorId);
  });
}
