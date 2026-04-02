import { useNavigate } from "react-router-dom";
import type { UserRole } from "@/domain/models";
import { useAuth } from "@/features/auth/context/AuthContext";

const loginOptions: ReadonlyArray<{
  readonly role: UserRole;
  readonly title: string;
  readonly description: string;
}> = [
  {
    role: "DOCTOR",
    title: "Doctor access",
    description:
      "Personal dashboard, requests, exchanges, fairness visibility, and roster viewing."
  },
  {
    role: "ADMIN",
    title: "Admin access",
    description:
      "Doctor management, shift configuration, roster generation, overrides, and audit workflows."
  }
];

export function LoginPage() {
  const navigate = useNavigate();
  const { loginAs } = useAuth();

  function handleLogin(role: UserRole) {
    loginAs(role);
    navigate("/roster");
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl items-center px-4 py-8">
      <section className="grid w-full gap-6 lg:grid-cols-[1.1fr,0.9fr]">
        <div className="rounded-[2rem] border border-brand-200 bg-brand-900 p-8 text-white shadow-panel">
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-brand-100">
            CCU / ICU Roster System
          </p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight">
            V1 foundation for a fair, auditable medical roster.
          </h1>
          <p className="mt-4 max-w-xl text-sm text-brand-50/85 sm:text-base">
            This starter shell separates the domain engine, admin operations, doctor
            workflows, and audit boundaries before real scheduling logic is added.
          </p>

          <div className="mt-8 grid gap-3 text-sm text-brand-50/90 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/15 bg-white/10 p-4">
              TODO: replace demo role switching with real authentication and session
              persistence.
            </div>
            <div className="rounded-2xl border border-white/15 bg-white/10 p-4">
              TODO: connect role-aware navigation to backend authorization checks.
            </div>
          </div>
        </div>

        <div className="rounded-[2rem] border border-slate-200 bg-white/90 p-6 shadow-panel backdrop-blur">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-brand-700">
              Sign In Placeholder
            </p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900">
              Choose a role to enter the app shell
            </h2>
            <p className="mt-3 text-sm text-slate-600">
              The current login screen is intentionally minimal so the repository can
              focus on domain boundaries first.
            </p>
          </div>

          <div className="mt-6 space-y-4">
            {loginOptions.map((option) => (
              <button
                key={option.role}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-left transition hover:border-brand-300 hover:bg-brand-50"
                onClick={() => handleLogin(option.role)}
                type="button"
              >
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">{option.title}</h3>
                    <p className="mt-1 text-sm text-slate-600">{option.description}</p>
                  </div>
                  <span className="rounded-full bg-brand-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-brand-800">
                    {option.role}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

