import { createContext, useContext, useState } from "react";
import type { User, UserRole } from "@/domain/models";

const STORAGE_KEY = "icu-hrm-demo-role";

interface AuthContextValue {
  readonly user: User | null;
  readonly role: UserRole | null;
  readonly isAuthenticated: boolean;
  loginAs(role: UserRole): void;
  logout(): void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function readStoredRole(): UserRole | null {
  if (typeof window === "undefined") {
    return null;
  }

  const storedRole = window.localStorage.getItem(STORAGE_KEY);
  return storedRole === "ADMIN" || storedRole === "DOCTOR" ? storedRole : null;
}

function createMockUser(role: UserRole): User {
  const now = new Date().toISOString();

  if (role === "ADMIN") {
    return {
      id: "user-admin-demo",
      role,
      uniqueIdentifier: "admin.demo",
      displayName: "Admin Demo",
      status: "ACTIVE",
      createdAt: now,
      updatedAt: now
    };
  }

  return {
    id: "user-doctor-demo",
    role,
    uniqueIdentifier: "doctor.demo",
    displayName: "Doctor Demo",
    linkedDoctorId: "doctor-demo",
    status: "ACTIVE",
    createdAt: now,
    updatedAt: now
  };
}

export function AuthProvider({ children }: { readonly children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const storedRole = readStoredRole();
    return storedRole ? createMockUser(storedRole) : null;
  });

  function loginAs(role: UserRole) {
    window.localStorage.setItem(STORAGE_KEY, role);
    setUser(createMockUser(role));
  }

  function logout() {
    window.localStorage.removeItem(STORAGE_KEY);
    setUser(null);
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        role: user?.role ?? null,
        isAuthenticated: user !== null,
        loginAs,
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider.");
  }

  return context;
}

