import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { RosterSnapshot } from "@/domain/models";
import { RosterLifecycleActions } from "@/features/roster/components/RosterLifecycleActions";

const baseSnapshot: RosterSnapshot = {
  roster: {
    id: "roster-test",
    period: {
      startDate: "2026-06-01",
      endDate: "2026-06-30"
    },
    status: "DRAFT",
    isDeleted: false,
    createdAt: "2026-06-01T00:00:00.000Z",
    createdByUserId: "user-admin-demo",
    generatedAt: "2026-06-01T00:00:00.000Z",
    weekendGroupSchedule: []
  },
  doctorReferences: [],
  shifts: [],
  assignments: [],
  warnings: [],
  validation: {
    isValid: true,
    issues: []
  },
  updatedBias: [],
  updatedWeekdayPairBias: [],
  generatedInputSummary: {
    rosterMonth: "2026-06",
    range: {
      startDate: "2026-06-01",
      endDate: "2026-06-30"
    },
    activeDoctorCount: 0,
    leaveCount: 0,
    offRequestCount: 0,
    shiftTypeCount: 2,
    firstWeekendOffGroup: "A",
    weekendGroupSchedule: [],
    activeBiasCriteria: [],
    activeDutyLocations: []
  }
};

function createSnapshot(status: "DRAFT" | "PUBLISHED" | "LOCKED"): RosterSnapshot {
  return {
    ...baseSnapshot,
    roster: {
      ...baseSnapshot.roster,
      status,
      publishedAt:
        status === "PUBLISHED" || status === "LOCKED"
          ? "2026-06-01T01:00:00.000Z"
          : undefined,
      lockedAt: status === "LOCKED" ? "2026-06-01T02:00:00.000Z" : undefined
    }
  };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("RosterLifecycleActions", () => {
  it("shows delete for non-locked snapshots and calls the delete handler after confirmation", async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);

    render(
      <RosterLifecycleActions
        latestDraft={createSnapshot("DRAFT")}
        activeOfficial={null}
        visibleSnapshot={createSnapshot("DRAFT")}
        viewMode="draft"
        onViewModeChange={vi.fn()}
        canPublish={true}
        canLock={false}
        canDelete={true}
        canUnlock={false}
        activeAction={null}
        onPublish={vi.fn()}
        onLock={vi.fn()}
        onUnlock={vi.fn()}
        onDelete={onDelete}
      />
    );

    expect(screen.getByRole("button", { name: "Delete Roster" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Unlock Roster" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Delete Roster" }));

    expect(confirmSpy).toHaveBeenCalledWith(
      "Delete this roster? This cannot be undone from the UI."
    );
    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it("shows unlock for locked snapshots and calls the unlock handler after confirmation", async () => {
    const user = userEvent.setup();
    const onUnlock = vi.fn();
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);

    render(
      <RosterLifecycleActions
        latestDraft={null}
        activeOfficial={createSnapshot("LOCKED")}
        visibleSnapshot={createSnapshot("LOCKED")}
        viewMode="official"
        onViewModeChange={vi.fn()}
        canPublish={false}
        canLock={false}
        canDelete={false}
        canUnlock={true}
        activeAction={null}
        onPublish={vi.fn()}
        onLock={vi.fn()}
        onUnlock={onUnlock}
        onDelete={vi.fn()}
      />
    );

    expect(screen.getByRole("button", { name: "Unlock Roster" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Delete Roster" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Unlock Roster" }));

    expect(confirmSpy).toHaveBeenCalledWith(
      "Unlock this roster? It will become published again and can then be deleted."
    );
    expect(onUnlock).toHaveBeenCalledTimes(1);
  });
});
