import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { AdminSettingsPage } from "@/features/admin/pages/AdminSettingsPage";

describe("AdminSettingsPage", () => {
  it("shows links to the rosters, doctors, shift types, duty designs, duty design assignments, duty locations, and bias criteria pages", () => {
    render(
      <MemoryRouter>
        <AdminSettingsPage />
      </MemoryRouter>
    );

    expect(screen.getByRole("link", { name: "Open Rosters" })).toHaveAttribute(
      "href",
      "/admin/rosters"
    );
    expect(screen.getByRole("link", { name: "Manage Doctors" })).toHaveAttribute(
      "href",
      "/admin/doctors"
    );
    expect(
      screen.getByRole("link", { name: "Manage Shift Types" })
    ).toHaveAttribute("href", "/admin/shift-types");
    expect(
      screen.getByRole("link", { name: "Manage Duty Designs" })
    ).toHaveAttribute("href", "/admin/duty-designs");
    expect(
      screen.getByRole("link", { name: "Open Duty Design Assignments" })
    ).toHaveAttribute("href", "/admin/duty-design-assignments");
    expect(
      screen.getByRole("link", { name: "Manage Duty Locations" })
    ).toHaveAttribute("href", "/admin/locations");
    expect(
      screen.getByRole("link", { name: "Manage Bias Criteria" })
    ).toHaveAttribute("href", "/admin/bias-criteria");
  });
});
