import { Navigate, Outlet } from "react-router-dom";
import type { UserRole } from "@/domain/models";
import { useAuth } from "@/features/auth/context/AuthContext";

interface RequireRoleProps {
  readonly allowedRoles: ReadonlyArray<UserRole>;
}

export function RequireRole({ allowedRoles }: RequireRoleProps) {
  const { role } = useAuth();

  if (!role) {
    return <Navigate replace to="/login" />;
  }

  if (!allowedRoles.includes(role)) {
    return <Navigate replace to="/roster" />;
  }

  return <Outlet />;
}

