import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "@/app/layouts/AppShell";
import { AdminBiasCriteriaPage } from "@/features/admin/pages/AdminBiasCriteriaPage";
import { AdminDutyDesignAssignmentPage } from "@/features/admin/pages/AdminDutyDesignAssignmentPage";
import { AdminDutyDesignPage } from "@/features/admin/pages/AdminDutyDesignPage";
import { AdminDoctorsPage } from "@/features/admin/pages/AdminDoctorsPage";
import { AdminLocationsPage } from "@/features/admin/pages/AdminLocationsPage";
import { AdminRostersPage } from "@/features/admin/pages/AdminRostersPage";
import { AdminSettingsPage } from "@/features/admin/pages/AdminSettingsPage";
import { AdminShiftTypePage } from "@/features/admin/pages/AdminShiftTypePage";
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
              <Route element={<AdminRostersPage />} path="/admin/rosters" />
              <Route element={<AdminDoctorsPage />} path="/admin/doctors" />
              <Route element={<AdminShiftTypePage />} path="/admin/shift-types" />
              <Route element={<AdminDutyDesignPage />} path="/admin/duty-designs" />
              <Route
                element={<AdminDutyDesignAssignmentPage />}
                path="/admin/duty-design-assignments"
              />
              <Route element={<AdminLocationsPage />} path="/admin/locations" />
              <Route
                element={<AdminBiasCriteriaPage />}
                path="/admin/bias-criteria"
              />
            </Route>
          </Route>
        </Route>

        <Route element={<Navigate replace to="/" />} path="*" />
      </Routes>
    </BrowserRouter>
  );
}
