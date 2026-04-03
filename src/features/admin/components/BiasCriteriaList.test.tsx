import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { BiasCriteriaList } from "@/features/admin/components/BiasCriteriaList";

function BiasCriteriaListHarness() {
  const [expandedCriteriaId, setExpandedCriteriaId] = useState<string | null>(null);
  const [selectedCriteriaId, setSelectedCriteriaId] = useState<string | null>(null);

  const criteria = {
    id: "criteria-weekend-night",
    code: "WEEKEND_NIGHT",
    label: "Weekend Night Coverage",
    locationIds: [],
    shiftTypeIds: [],
    weekdayConditions: ["SAT", "SUN"] as const,
    isWeekendOnly: true,
    isActive: true,
    isLocked: false,
    createdAt: "2026-04-03T08:00:00.000Z",
    updatedAt: "2026-04-03T08:00:00.000Z",
    createdByActorId: "user-admin-demo",
    updatedByActorId: "user-admin-demo"
  };

  return (
    <BiasCriteriaList
      criteriaEntries={[criteria]}
      doctorBiasListErrors={{}}
      doctorBiasListsByCriteriaId={{
        [criteria.id]: [
          {
            doctorId: "doctor-under",
            doctorName: "Dr. Under Assigned",
            doctorUniqueId: "under.assigned",
            biasValue: -2,
            isActive: true
          },
          {
            doctorId: "doctor-over",
            doctorName: "Dr. Over Assigned",
            doctorUniqueId: "over.assigned",
            biasValue: 3,
            isActive: false
          }
        ]
      }}
      expandedCriteriaId={expandedCriteriaId}
      isLoading={false}
      loadingDoctorBiasCriteriaIds={new Set<string>()}
      locations={[]}
      onCreateCriteria={vi.fn()}
      onCriteriaCardClick={(criteriaId) => {
        setSelectedCriteriaId(criteriaId);
        setExpandedCriteriaId((currentId) =>
          currentId === criteriaId ? null : criteriaId
        );
      }}
      onRetryDoctorBiasList={vi.fn()}
      selectedCriteriaId={selectedCriteriaId}
      shiftTypes={[]}
    />
  );
}

describe("BiasCriteriaList", () => {
  it("renders the empty state when no criteria exist", () => {
    render(
      <BiasCriteriaList
        criteriaEntries={[]}
        doctorBiasListErrors={{}}
        doctorBiasListsByCriteriaId={{}}
        expandedCriteriaId={null}
        isLoading={false}
        loadingDoctorBiasCriteriaIds={new Set<string>()}
        locations={[]}
        onCreateCriteria={vi.fn()}
        onCriteriaCardClick={vi.fn()}
        onRetryDoctorBiasList={vi.fn()}
        selectedCriteriaId={null}
        shiftTypes={[]}
      />
    );

    expect(
      screen.getByText(
        "No bias criteria exist yet. Add the first criteria record to prepare for dynamic fairness rules in the next phase."
      )
    ).toBeInTheDocument();
  });

  it("expands a criteria card, shows doctor rankings, and collapses on second click", async () => {
    const user = userEvent.setup();

    render(<BiasCriteriaListHarness />);

    const cardButton = screen.getByRole("button", {
      name: /Weekend Night Coverage/i
    });

    expect(cardButton).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText("Doctor Bias Rankings")).not.toBeInTheDocument();

    await user.click(cardButton);

    expect(cardButton).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("Doctor Bias Rankings")).toBeInTheDocument();
    expect(screen.getByText("Dr. Under Assigned")).toBeInTheDocument();
    expect(screen.getByText("-2")).toBeInTheDocument();
    expect(screen.getByText("Dr. Over Assigned")).toBeInTheDocument();
    expect(screen.getByText("+3")).toBeInTheDocument();
    expect(screen.getByText("Inactive")).toBeInTheDocument();

    await user.click(cardButton);

    expect(cardButton).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText("Doctor Bias Rankings")).not.toBeInTheDocument();
  });

  it("renders inline retry messaging when loading doctor bias data fails", async () => {
    const retryDoctorBiasList = vi.fn();
    const user = userEvent.setup();

    render(
      <BiasCriteriaList
        criteriaEntries={[
          {
            id: "criteria-error",
            code: "ERROR_CASE",
            label: "Error Criteria",
            locationIds: [],
            shiftTypeIds: [],
            weekdayConditions: [],
            isWeekendOnly: false,
            isActive: true,
            isLocked: false,
            createdAt: "2026-04-03T08:00:00.000Z",
            updatedAt: "2026-04-03T08:00:00.000Z",
            createdByActorId: "user-admin-demo",
            updatedByActorId: "user-admin-demo"
          }
        ]}
        doctorBiasListErrors={{
          "criteria-error": "Unable to load doctor bias data."
        }}
        doctorBiasListsByCriteriaId={{}}
        expandedCriteriaId="criteria-error"
        isLoading={false}
        loadingDoctorBiasCriteriaIds={new Set<string>()}
        locations={[]}
        onCreateCriteria={vi.fn()}
        onCriteriaCardClick={vi.fn()}
        onRetryDoctorBiasList={retryDoctorBiasList}
        selectedCriteriaId="criteria-error"
        shiftTypes={[]}
      />
    );

    expect(screen.getByText("Unable to load doctor bias data.")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Retry" }));

    expect(retryDoctorBiasList).toHaveBeenCalledWith("criteria-error");
  });
});
