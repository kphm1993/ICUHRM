import { PagePlaceholder } from "@/shared/ui/PagePlaceholder";

export function AdminSettingsPage() {
  return (
    <PagePlaceholder
      eyebrow="Admin"
      title="Admin Settings"
      description="This admin-only area is reserved for doctor management, shift configuration, bias control, high-impact override actions, and audit-aware system settings."
      footerNote="TODO: add confirmation-heavy admin actions with audit logging for each high-impact change."
      sections={[
        {
          title: "Foundational Modules",
          items: [
            "Doctor management service boundary for create, deactivate, and weekend-group edits.",
            "Bias management service boundary for reset and manual adjustments.",
            "Audit log service boundary for append-only operational traceability."
          ]
        },
        {
          title: "Upcoming Admin Work",
          items: [
            "Shift type configuration and future roster generation controls.",
            "Leave administration and request oversight.",
            "Operational override tooling with explicit before/after logging."
          ]
        }
      ]}
    />
  );
}

