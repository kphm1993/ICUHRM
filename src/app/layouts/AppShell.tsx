import { NavLink, Outlet } from "react-router-dom";
import type { UserRole } from "@/domain/models";
import { useAuth } from "@/features/auth/context/AuthContext";

const navigationItems: ReadonlyArray<{
  readonly to: string;
  readonly label: string;
  readonly roles: ReadonlyArray<UserRole>;
}> = [
  { to: "/roster", label: "Roster", roles: ["ADMIN", "DOCTOR"] },
  { to: "/doctor-dashboard", label: "Doctor Dashboard", roles: ["ADMIN", "DOCTOR"] },
  { to: "/fairness", label: "Fairness", roles: ["ADMIN", "DOCTOR"] },
  { to: "/requests", label: "Requests", roles: ["ADMIN", "DOCTOR"] },
  { to: "/admin", label: "Admin Settings", roles: ["ADMIN"] }
];

function getRoleLabel(role: UserRole) {
  return role === "ADMIN" ? "Administrator" : "Doctor";
}

export function AppShell() {
  const { role, user, logout } = useAuth();

  if (!role || !user) {
    return null;
  }

  const visibleNavigation = navigationItems.filter((item) => item.roles.includes(role));

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="mx-auto max-w-6xl px-4 py-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-brand-700">
                CCU / ICU Roster System
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <h1 className="text-xl font-semibold tracking-tight text-slate-900">
                  V1 Roster Workflow
                </h1>
                <span className="rounded-full bg-brand-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-brand-800">
                  {getRoleLabel(role)}
                </span>
              </div>
              <p className="mt-2 text-sm text-slate-600">
                Signed in as {user.displayName}. The app now keeps admin workflow rules,
                scheduling logic, and persisted roster snapshots outside the UI layer.
              </p>
            </div>

            <button
              className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-brand-400 hover:text-brand-800"
              onClick={logout}
              type="button"
            >
              Sign Out
            </button>
          </div>

          <nav className="mt-4 flex gap-2 overflow-x-auto pb-1">
            {visibleNavigation.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  [
                    "whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition",
                    isActive
                      ? "bg-brand-700 text-white shadow-sm"
                      : "border border-slate-200 bg-slate-50 text-slate-600 hover:border-brand-300 hover:bg-brand-50 hover:text-brand-800"
                  ].join(" ")
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
