import { PagePlaceholder } from "@/shared/ui/PagePlaceholder";

export function RosterPage() {
  return (
    <PagePlaceholder
      eyebrow="Roster"
      title="Calendar / Roster"
      description="This screen is reserved for immutable roster snapshots, day and night assignment visibility, publication state, and future admin override tooling."
      footerNote="TODO: connect this page to generated shift instances, assignment records, exchange badges, and publish/lock actions."
      sections={[
        {
          title: "What Exists Now",
          items: [
            "Protected route inside a shared application shell.",
            "Dedicated roster feature area separated from domain scheduling logic.",
            "Space reserved for mobile-first calendar rendering and status legends."
          ]
        },
        {
          title: "Next Build Targets",
          items: [
            "Read-only roster month selector backed by roster snapshots.",
            "Calendar cells that distinguish weekday, weekend, day, night, leave, and exchange states.",
            "Admin actions for generate, publish, lock, and override with audit hooks."
          ]
        }
      ]}
    />
  );
}

