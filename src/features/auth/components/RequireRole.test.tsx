import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RequireRole } from "@/features/auth/components/RequireRole";

const mockUseAuth = vi.fn();

vi.mock("@/features/auth/context/AuthContext", () => ({
  useAuth: () => mockUseAuth()
}));

function renderRequireRole(role: "ADMIN" | "DOCTOR" | null) {
  mockUseAuth.mockReturnValue({ role });

  return render(
    <MemoryRouter initialEntries={["/admin"]}>
      <Routes>
        <Route element={<RequireRole allowedRoles={["ADMIN"]} />}>
          <Route element={<div>Admin Page</div>} path="/admin" />
        </Route>
        <Route element={<div>Roster Page</div>} path="/roster" />
        <Route element={<div>Login Page</div>} path="/login" />
      </Routes>
    </MemoryRouter>
  );
}

describe("RequireRole", () => {
  beforeEach(() => {
    mockUseAuth.mockReset();
  });

  it("allows admin users to access admin routes", () => {
    renderRequireRole("ADMIN");

    expect(screen.getByText("Admin Page")).toBeInTheDocument();
  });

  it("redirects non-admin users to the roster page", () => {
    renderRequireRole("DOCTOR");

    expect(screen.getByText("Roster Page")).toBeInTheDocument();
    expect(screen.queryByText("Admin Page")).not.toBeInTheDocument();
  });

  it("redirects unauthenticated users to the login page", () => {
    renderRequireRole(null);

    expect(screen.getByText("Login Page")).toBeInTheDocument();
  });
});
