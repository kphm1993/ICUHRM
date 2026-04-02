import { PagePlaceholder } from "@/shared/ui/PagePlaceholder";

export function DoctorDashboardPage() {
  return (
    <PagePlaceholder
      eyebrow="Doctor"
      title="Doctor Dashboard"
      description="This dashboard will focus on the doctor-facing view of personal assignments, fairness position, request history, and exchange activity."
      footerNote="TODO: hydrate this page from doctor profile, roster assignments, request summaries, and personal bias ledger views."
      sections={[
        {
          title: "Planned Panels",
          items: [
            "Personal duty list with upcoming day and night shifts.",
            "Bias and fairness summary separated by weekday and weekend categories.",
            "Quick links for leave, off requests, and exchange actions."
          ]
        },
        {
          title: "Boundary Decisions",
          items: [
            "Business rules stay in services and domain modules, not in dashboard components.",
            "Doctor-only affordances remain distinct from admin controls.",
            "Roster history will read immutable snapshots instead of recomputed client-side data."
          ]
        }
      ]}
    />
  );
}

