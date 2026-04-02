import { PagePlaceholder } from "@/shared/ui/PagePlaceholder";

export function RequestsPage() {
  return (
    <PagePlaceholder
      eyebrow="Requests"
      title="Requests"
      description="This feature surface will combine off-day requests and exchange workflows while keeping their rules, status handling, and audit paths distinct."
      footerNote="TODO: add request window validation, weekend request restrictions, exchange response flows, and request status timelines."
      sections={[
        {
          title: "Off-Day Requests",
          items: [
            "Doctor submission UI will target a dedicated off-request service boundary.",
            "Weekend dates will be blocked by domain validation rather than UI-only checks.",
            "Priority and timestamp ordering will stay explicit for explainable conflict resolution."
          ]
        },
        {
          title: "Exchange Requests",
          items: [
            "Exchange requests will update actual performer only.",
            "Assigned owner and fairness owner remain separate in the assignment model.",
            "Acceptance, rejection, and cancellation all route through audit-aware services."
          ]
        }
      ]}
    />
  );
}

