import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { BiasCriteriaList } from "@/features/admin/components/BiasCriteriaList";

describe("BiasCriteriaList", () => {
  it("renders the empty state when no criteria exist", () => {
    render(
      <BiasCriteriaList
        criteriaEntries={[]}
        isLoading={false}
        locations={[]}
        onCreateCriteria={vi.fn()}
        onSelectCriteria={vi.fn()}
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
});
