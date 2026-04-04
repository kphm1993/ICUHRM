import type {
  AssignedGroupConstraint,
  BiasLedger,
  DoctorExclusionPeriod,
  DutyDesignAssignment,
  ManualShiftAssignment,
  RosterWizardDraft,
  RosterWizardStep
} from "@/domain/models";
import type {
  RosterWizardDraftRepository,
  RosterWizardDraftRepositoryFilter
} from "@/domain/repositories";
import type { BrowserStorageRepositoryOptions } from "@/infrastructure/repositories/browserStorage/storage";
import {
  readCollectionFromStorage,
  STORAGE_KEYS,
  writeCollectionToStorage
} from "@/infrastructure/repositories/browserStorage/storage";

type StoredRosterWizardDraft = RosterWizardDraft &
  Partial<Pick<RosterWizardDraft, "name" | "publicHolidayDates" | "groupConstraintTemplateIds" | "groupConstraints" | "excludedDoctorPeriods" | "dutyDesignAssignments" | "manualShiftAssignments" | "currentBiasSnapshot" | "status" | "currentStep">>;

function cloneBiasLedger(entry: BiasLedger): BiasLedger {
  return {
    ...entry,
    balances: { ...entry.balances }
  };
}

function cloneGroupConstraint(
  constraint: AssignedGroupConstraint
): AssignedGroupConstraint {
  return { ...constraint };
}

function cloneDoctorExclusionPeriod(
  period: DoctorExclusionPeriod
): DoctorExclusionPeriod {
  return { ...period };
}

function cloneDutyDesignAssignment(
  assignment: DutyDesignAssignment
): DutyDesignAssignment {
  return { ...assignment };
}

function cloneManualShiftAssignment(
  assignment: ManualShiftAssignment
): ManualShiftAssignment {
  return { ...assignment };
}

function normalizeStep(step: number | undefined): RosterWizardStep {
  if (step === 2 || step === 3 || step === 4 || step === 5) {
    return step;
  }

  return 1;
}

function cloneDraft(draft: StoredRosterWizardDraft): RosterWizardDraft {
  return {
    id: draft.id,
    name: draft.name ?? `Roster Wizard ${draft.rosterMonth}`,
    createdByActorId: draft.createdByActorId,
    createdAt: draft.createdAt,
    updatedAt: draft.updatedAt,
    rosterMonth: draft.rosterMonth,
    customRange: draft.customRange ? { ...draft.customRange } : undefined,
    publicHolidayDates: [...(draft.publicHolidayDates ?? [])],
    groupConstraintTemplateIds: [...(draft.groupConstraintTemplateIds ?? [])],
    groupConstraints: (draft.groupConstraints ?? []).map(cloneGroupConstraint),
    excludedDoctorPeriods: (draft.excludedDoctorPeriods ?? []).map(
      cloneDoctorExclusionPeriod
    ),
    dutyDesignAssignments: (draft.dutyDesignAssignments ?? []).map(
      cloneDutyDesignAssignment
    ),
    manualShiftAssignments: (draft.manualShiftAssignments ?? []).map(
      cloneManualShiftAssignment
    ),
    currentBiasSnapshot: (draft.currentBiasSnapshot ?? []).map(cloneBiasLedger),
    status: draft.status ?? "DRAFT",
    currentStep: normalizeStep(draft.currentStep)
  };
}

function sortDrafts(
  drafts: ReadonlyArray<RosterWizardDraft>
): ReadonlyArray<RosterWizardDraft> {
  return [...drafts].sort((left, right) => {
    const updatedAtComparison = right.updatedAt.localeCompare(left.updatedAt);
    if (updatedAtComparison !== 0) {
      return updatedAtComparison;
    }

    const createdAtComparison = right.createdAt.localeCompare(left.createdAt);
    if (createdAtComparison !== 0) {
      return createdAtComparison;
    }

    return left.id.localeCompare(right.id);
  });
}

export class LocalStorageRosterWizardDraftRepository
  implements RosterWizardDraftRepository
{
  private readonly storageKey: string;
  private readonly seedData: ReadonlyArray<RosterWizardDraft>;

  constructor(options: BrowserStorageRepositoryOptions<RosterWizardDraft> = {}) {
    this.storageKey = options.storageKey ?? STORAGE_KEYS.rosterWizardDrafts;
    this.seedData = options.seedData ?? [];
  }

  async list(
    filter?: RosterWizardDraftRepositoryFilter
  ): Promise<ReadonlyArray<RosterWizardDraft>> {
    return sortDrafts(
      this.readEntries().filter((draft) => {
        if (
          filter?.createdByActorId !== undefined &&
          draft.createdByActorId !== filter.createdByActorId
        ) {
          return false;
        }

        if (filter?.rosterMonth !== undefined && draft.rosterMonth !== filter.rosterMonth) {
          return false;
        }

        if (filter?.statuses?.length && !filter.statuses.includes(draft.status)) {
          return false;
        }

        return true;
      })
    ).map(cloneDraft);
  }

  async findById(id: string): Promise<RosterWizardDraft | null> {
    const draft = this.readEntries().find((entry) => entry.id === id);
    return draft ? cloneDraft(draft) : null;
  }

  async save(draft: RosterWizardDraft): Promise<RosterWizardDraft> {
    const entries = this.readEntries().filter((entry) => entry.id !== draft.id);
    entries.push(cloneDraft(draft));
    this.writeEntries(entries);
    return cloneDraft(draft);
  }

  async delete(id: string): Promise<void> {
    const entries = this.readEntries().filter((entry) => entry.id !== id);
    this.writeEntries(entries);
  }

  private readEntries(): RosterWizardDraft[] {
    return readCollectionFromStorage<StoredRosterWizardDraft>(
      this.storageKey,
      this.seedData
    ).map(cloneDraft);
  }

  private writeEntries(entries: ReadonlyArray<RosterWizardDraft>): void {
    writeCollectionToStorage(
      this.storageKey,
      sortDrafts(entries).map(cloneDraft)
    );
  }
}
