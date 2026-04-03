import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppShell } from "@/app/layouts/AppShell";

const mockUseAuth = vi.fn();

vi.mock("@/features/auth/context/AuthContext", () => ({
  useAuth: () => mockUseAuth()
}));

function renderAppShell() {
  return render(
    <MemoryRouter initialEntries={["/roster"]}>
      <Routes>
        <Route element={<AppShell />}>
          <Route element={<div>Roster Content</div>} path="/roster" />
        </Route>
      </Routes>
    </MemoryRouter>
  );
}

describe("AppShell navigation", () => {
  beforeEach(() => {
    mockUseAuth.mockReset();
  });

  it("shows Admin Tools and Roster for admin users", () => {
    mockUseAuth.mockReturnValue({
      role: "ADMIN",
      user: {
        id: "user-admin-demo",
        displayName: "Admin Demo"
      },
      logout: vi.fn()
    });

    renderAppShell();

    expect(screen.getByRole("link", { name: "Roster" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Admin Tools" })).toBeInTheDocument();
  });

  it("hides Admin Tools and keeps Roster visible for doctor users", () => {
    mockUseAuth.mockReturnValue({
      role: "DOCTOR",
      user: {
        id: "user-doctor-demo",
        displayName: "Doctor Demo"
      },
      logout: vi.fn()
    });

    renderAppShell();

    expect(screen.getByRole("link", { name: "Roster" })).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Admin Tools" })
    ).not.toBeInTheDocument();
  });
});
