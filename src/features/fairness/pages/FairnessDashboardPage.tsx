import { PagePlaceholder } from "@/shared/ui/PagePlaceholder";

export function FairnessDashboardPage() {
  return (
    <PagePlaceholder
      eyebrow="Fairness"
      title="Fairness Dashboard"
      description="This area is reserved for explainable comparisons across doctors, using availability-adjusted fairness and separate weekday/weekend bias tracking."
      footerNote="TODO: implement comparative tables, balance cards, and ledger history sourced from bias snapshots rather than derived UI counters."
      sections={[
        {
          title: "Domain Focus",
          items: [
            "Weekday day, weekday night, weekend day, and weekend night stay separate.",
            "Bias remains a ledger model, not a cosmetic counter in the UI.",
            "Exchange handling will preserve fairness ownership even when actual performer changes."
          ]
        },
        {
          title: "Future Views",
          items: [
            "Doctor-by-doctor fairness comparison cards.",
            "Bias trend history by roster month.",
            "Admin controls for adjustment and reset routed through auditable services."
          ]
        }
      ]}
    />
  );
}

