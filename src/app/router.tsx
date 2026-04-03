import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "@/app/layouts/AppShell";
import { AdminSettingsPage } from "@/features/admin/pages/AdminSettingsPage";
import { LoginPage } from "@/features/auth/pages/LoginPage";
import { RequireAuth } from "@/features/auth/components/RequireAuth";
import { RequireRole } from "@/features/auth/components/RequireRole";
import { useAuth } from "@/features/auth/context/AuthContext";
import { DoctorDashboardPage } from "@/features/doctors/pages/DoctorDashboardPage";
import { FairnessDashboardPage } from "@/features/fairness/pages/FairnessDashboardPage";
import { RequestsPage } from "@/features/requests/pages/RequestsPage";
import { DoctorRosterCalendarPage } from "@/features/roster/pages/DoctorRosterCalendarPage";
import { RosterPage } from "@/features/roster/pages/RosterPage";

function IndexRedirect() {
  const { isAuthenticated } = useAuth();
  return <Navigate replace to={isAuthenticated ? "/roster" : "/login"} />;
}

function LoginRoute() {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <Navigate replace to="/roster" /> : <LoginPage />;
}

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<IndexRedirect />} path="/" />
        <Route element={<LoginRoute />} path="/login" />

        <Route element={<RequireAuth />}>
          <Route element={<AppShell />}>
            <Route element={<RosterPage />} path="/roster" />
            <Route element={<DoctorDashboardPage />} path="/doctor-dashboard" />
            <Route
              element={<DoctorRosterCalendarPage />}
              path="/dashboard/roster-calendar"
            />
            <Route element={<FairnessDashboardPage />} path="/fairness" />
            <Route element={<RequestsPage />} path="/requests" />

            <Route element={<RequireRole allowedRoles={["ADMIN"]} />}>
              <Route element={<AdminSettingsPage />} path="/admin" />
            </Route>
          </Route>
        </Route>

        <Route element={<Navigate replace to="/" />} path="*" />
      </Routes>
    </BrowserRouter>
  );
}
