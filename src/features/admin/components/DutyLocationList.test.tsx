import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DutyLocationList } from "@/features/admin/components/DutyLocationList";

describe("DutyLocationList", () => {
  it("renders the empty state when no locations exist", () => {
    render(
      <DutyLocationList
        isLoading={false}
        locations={[]}
        onCreateLocation={vi.fn()}
        onSelectLocation={vi.fn()}
        selectedLocationId={null}
      />
    );

    expect(
      screen.getByText(
        "No duty locations exist yet. Add the first location to support future location-aware criteria."
      )
    ).toBeInTheDocument();
  });
});
