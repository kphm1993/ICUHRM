import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { AdminToolsSubnav } from "@/features/admin/components/AdminToolsSubnav";

describe("AdminToolsSubnav", () => {
  it("renders links to the admin hub, rosters, doctors, shift types, duty designs, duty design assignments, locations, and bias criteria pages", () => {
    render(
      <MemoryRouter>
        <AdminToolsSubnav />
      </MemoryRouter>
    );

    expect(screen.getByRole("link", { name: "Admin Hub" })).toHaveAttribute(
      "href",
      "/admin"
    );
    expect(screen.getByRole("link", { name: "Rosters" })).toHaveAttribute(
      "href",
      "/admin/rosters"
    );
    expect(screen.getByRole("link", { name: "Doctors" })).toHaveAttribute(
      "href",
      "/admin/doctors"
    );
    expect(screen.getByRole("link", { name: "Shift Types" })).toHaveAttribute(
      "href",
      "/admin/shift-types"
    );
    expect(screen.getByRole("link", { name: "Duty Designs" })).toHaveAttribute(
      "href",
      "/admin/duty-designs"
    );
    expect(
      screen.getByRole("link", { name: "Duty Design Assignments" })
    ).toHaveAttribute("href", "/admin/duty-design-assignments");
    expect(
      screen.getByRole("link", { name: "Duty Locations" })
    ).toHaveAttribute("href", "/admin/locations");
    expect(
      screen.getByRole("link", { name: "Bias Criteria" })
    ).toHaveAttribute("href", "/admin/bias-criteria");
  });
});
