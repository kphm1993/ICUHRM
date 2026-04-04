import { afterEach, describe, expect, it } from "vitest";
import type { RosterWizardDraft } from "@/domain/models";
import { LocalStorageRosterWizardDraftRepository } from "@/infrastructure/repositories/browserStorage/LocalStorageRosterWizardDraftRepository";
import { removeStorageCollection } from "@/infrastructure/repositories/browserStorage/storage";

function createDraft(overrides: Partial<RosterWizardDraft> = {}): RosterWizardDraft {
  return {
    id: overrides.id ?? "wizard-draft-1",
    name: overrides.name ?? "Roster Wizard 2026-06",
    createdByActorId: overrides.createdByActorId ?? "user-admin-demo",
    createdAt: overrides.createdAt ?? "2026-04-10T08:00:00.000Z",
    updatedAt: overrides.updatedAt ?? "2026-04-10T08:00:00.000Z",
    rosterMonth: overrides.rosterMonth ?? "2026-06",
    customRange: overrides.customRange,
    publicHolidayDates: overrides.publicHolidayDates ?? ["2026-06-12"],
    groupConstraintTemplateIds: overrides.groupConstraintTemplateIds ?? ["template-a"],
    groupConstraints: overrides.groupConstraints ?? [
      {
        date: "2026-06-12",
        templateId: "template-a"
      }
    ],
    excludedDoctorPeriods: overrides.excludedDoctorPeriods ?? [
      {
        id: "exclusion-1",
        doctorId: "doctor-a",
        startDate: "2026-06-14",
        endDate: "2026-06-16",
        reason: "Conference"
      }
    ],
    dutyDesignAssignments: overrides.dutyDesignAssignments ?? [
      {
        id: "assignment-1",
        date: "2026-06-12",
        dutyDesignId: "design-a",
        isHolidayOverride: false,
        createdAt: "2026-04-10T08:00:00.000Z",
        updatedAt: "2026-04-10T08:00:00.000Z"
      }
    ],
    manualShiftAssignments: overrides.manualShiftAssignments ?? [
      {
        shiftId: "shift-1",
        doctorId: "doctor-a"
      }
    ],
    currentBiasSnapshot: overrides.currentBiasSnapshot ?? [
      {
        id: "bias-1",
        doctorId: "doctor-a",
        effectiveMonth: "2026-06",
        balances: {
          "criteria-day-all": -1
        },
        source: "ROSTER_GENERATION",
        sourceReferenceId: "roster-prev",
        updatedAt: "2026-04-10T08:00:00.000Z",
        updatedByActorId: "system"
      }
    ],
    status: overrides.status ?? "DRAFT",
    currentStep: overrides.currentStep ?? 2
  };
}

describe("LocalStorageRosterWizardDraftRepository", () => {
  const storageKey = "icu-hrm:test:roster-wizard-drafts";

  afterEach(() => {
    removeStorageCollection(storageKey);
    window.localStorage.clear();
  });

  it("persists wizard drafts across repository recreation", async () => {
    const repository = new LocalStorageRosterWizardDraftRepository({
      storageKey,
      seedData: []
    });
    const savedDraft = await repository.save(createDraft());

    const reloadedRepository = new LocalStorageRosterWizardDraftRepository({
      storageKey,
      seedData: []
    });
    const listedDrafts = await reloadedRepository.list({
      createdByActorId: "user-admin-demo"
    });

    expect(listedDrafts).toEqual([savedDraft]);
    expect(await reloadedRepository.findById(savedDraft.id)).toEqual(savedDraft);
  });

  it("filters drafts by owner, month, and status", async () => {
    const repository = new LocalStorageRosterWizardDraftRepository({
      storageKey,
      seedData: []
    });

    await repository.save(createDraft());
    await repository.save(
      createDraft({
        id: "wizard-draft-2",
        createdByActorId: "user-admin-other",
        rosterMonth: "2026-07",
        status: "LOCKED",
        updatedAt: "2026-04-11T08:00:00.000Z"
      })
    );

    const filteredDrafts = await repository.list({
      createdByActorId: "user-admin-other",
      rosterMonth: "2026-07",
      statuses: ["LOCKED"]
    });

    expect(filteredDrafts).toHaveLength(1);
    expect(filteredDrafts[0]?.id).toBe("wizard-draft-2");
  });
});
