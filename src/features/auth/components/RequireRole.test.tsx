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

function renderRequireRoleRoute(options: {
  readonly role: "ADMIN" | "DOCTOR" | null;
  readonly initialEntry: string;
  readonly protectedPath: string;
  readonly protectedLabel: string;
}) {
  mockUseAuth.mockReturnValue({ role: options.role });

  return render(
    <MemoryRouter initialEntries={[options.initialEntry]}>
      <Routes>
        <Route element={<RequireRole allowedRoles={["ADMIN"]} />}>
          <Route
            element={<div>{options.protectedLabel}</div>}
            path={options.protectedPath}
          />
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

  it("redirects doctor users away from /admin/locations", () => {
    renderRequireRoleRoute({
      role: "DOCTOR",
      initialEntry: "/admin/locations",
      protectedPath: "/admin/locations",
      protectedLabel: "Locations Page"
    });

    expect(screen.getByText("Roster Page")).toBeInTheDocument();
    expect(screen.queryByText("Locations Page")).not.toBeInTheDocument();
  });

  it("allows admin users to access /admin/locations", () => {
    renderRequireRoleRoute({
      role: "ADMIN",
      initialEntry: "/admin/locations",
      protectedPath: "/admin/locations",
      protectedLabel: "Locations Page"
    });

    expect(screen.getByText("Locations Page")).toBeInTheDocument();
    expect(screen.queryByText("Roster Page")).not.toBeInTheDocument();
  });

  it("redirects doctor users away from /admin/rosters", () => {
    renderRequireRoleRoute({
      role: "DOCTOR",
      initialEntry: "/admin/rosters",
      protectedPath: "/admin/rosters",
      protectedLabel: "Rosters Page"
    });

    expect(screen.getByText("Roster Page")).toBeInTheDocument();
    expect(screen.queryByText("Rosters Page")).not.toBeInTheDocument();
  });

  it("allows admin users to access /admin/rosters", () => {
    renderRequireRoleRoute({
      role: "ADMIN",
      initialEntry: "/admin/rosters",
      protectedPath: "/admin/rosters",
      protectedLabel: "Rosters Page"
    });

    expect(screen.getByText("Rosters Page")).toBeInTheDocument();
    expect(screen.queryByText("Roster Page")).not.toBeInTheDocument();
  });

  it("redirects doctor users away from /admin/doctors", () => {
    renderRequireRoleRoute({
      role: "DOCTOR",
      initialEntry: "/admin/doctors",
      protectedPath: "/admin/doctors",
      protectedLabel: "Doctors Page"
    });

    expect(screen.getByText("Roster Page")).toBeInTheDocument();
    expect(screen.queryByText("Doctors Page")).not.toBeInTheDocument();
  });

  it("allows admin users to access /admin/doctors", () => {
    renderRequireRoleRoute({
      role: "ADMIN",
      initialEntry: "/admin/doctors",
      protectedPath: "/admin/doctors",
      protectedLabel: "Doctors Page"
    });

    expect(screen.getByText("Doctors Page")).toBeInTheDocument();
    expect(screen.queryByText("Roster Page")).not.toBeInTheDocument();
  });

  it("redirects doctor users away from /admin/shift-types", () => {
    renderRequireRoleRoute({
      role: "DOCTOR",
      initialEntry: "/admin/shift-types",
      protectedPath: "/admin/shift-types",
      protectedLabel: "Shift Types Page"
    });

    expect(screen.getByText("Roster Page")).toBeInTheDocument();
    expect(screen.queryByText("Shift Types Page")).not.toBeInTheDocument();
  });

  it("allows admin users to access /admin/shift-types", () => {
    renderRequireRoleRoute({
      role: "ADMIN",
      initialEntry: "/admin/shift-types",
      protectedPath: "/admin/shift-types",
      protectedLabel: "Shift Types Page"
    });

    expect(screen.getByText("Shift Types Page")).toBeInTheDocument();
    expect(screen.queryByText("Roster Page")).not.toBeInTheDocument();
  });

  it("redirects doctor users away from /admin/duty-designs", () => {
    renderRequireRoleRoute({
      role: "DOCTOR",
      initialEntry: "/admin/duty-designs",
      protectedPath: "/admin/duty-designs",
      protectedLabel: "Duty Designs Page"
    });

    expect(screen.getByText("Roster Page")).toBeInTheDocument();
    expect(screen.queryByText("Duty Designs Page")).not.toBeInTheDocument();
  });

  it("allows admin users to access /admin/duty-designs", () => {
    renderRequireRoleRoute({
      role: "ADMIN",
      initialEntry: "/admin/duty-designs",
      protectedPath: "/admin/duty-designs",
      protectedLabel: "Duty Designs Page"
    });

    expect(screen.getByText("Duty Designs Page")).toBeInTheDocument();
    expect(screen.queryByText("Roster Page")).not.toBeInTheDocument();
  });

  it("redirects doctor users away from /admin/duty-design-assignments", () => {
    renderRequireRoleRoute({
      role: "DOCTOR",
      initialEntry: "/admin/duty-design-assignments",
      protectedPath: "/admin/duty-design-assignments",
      protectedLabel: "Duty Design Assignments Page"
    });

    expect(screen.getByText("Roster Page")).toBeInTheDocument();
    expect(
      screen.queryByText("Duty Design Assignments Page")
    ).not.toBeInTheDocument();
  });

  it("allows admin users to access /admin/duty-design-assignments", () => {
    renderRequireRoleRoute({
      role: "ADMIN",
      initialEntry: "/admin/duty-design-assignments",
      protectedPath: "/admin/duty-design-assignments",
      protectedLabel: "Duty Design Assignments Page"
    });

    expect(screen.getByText("Duty Design Assignments Page")).toBeInTheDocument();
    expect(screen.queryByText("Roster Page")).not.toBeInTheDocument();
  });

  it("redirects doctor users away from /admin/bias-criteria", () => {
    renderRequireRoleRoute({
      role: "DOCTOR",
      initialEntry: "/admin/bias-criteria",
      protectedPath: "/admin/bias-criteria",
      protectedLabel: "Bias Criteria Page"
    });

    expect(screen.getByText("Roster Page")).toBeInTheDocument();
    expect(screen.queryByText("Bias Criteria Page")).not.toBeInTheDocument();
  });

  it("allows admin users to access /admin/bias-criteria", () => {
    renderRequireRoleRoute({
      role: "ADMIN",
      initialEntry: "/admin/bias-criteria",
      protectedPath: "/admin/bias-criteria",
      protectedLabel: "Bias Criteria Page"
    });

    expect(screen.getByText("Bias Criteria Page")).toBeInTheDocument();
    expect(screen.queryByText("Roster Page")).not.toBeInTheDocument();
  });
});
