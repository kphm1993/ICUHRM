import type {
  AssignedGroupConstraint,
  BiasLedger,
  DoctorExclusionPeriod,
  DutyDesignAssignment,
  ManualShiftAssignment,
  RosterWizardDraft
} from "@/domain/models";
import type {
  RosterWizardDraftRepository,
  RosterWizardDraftRepositoryFilter
} from "@/domain/repositories";

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

function cloneDraft(draft: RosterWizardDraft): RosterWizardDraft {
  return {
    ...draft,
    customRange: draft.customRange ? { ...draft.customRange } : undefined,
    publicHolidayDates: [...draft.publicHolidayDates],
    groupConstraintTemplateIds: [...draft.groupConstraintTemplateIds],
    groupConstraints: draft.groupConstraints.map(cloneGroupConstraint),
    excludedDoctorPeriods: draft.excludedDoctorPeriods.map(cloneDoctorExclusionPeriod),
    dutyDesignAssignments: draft.dutyDesignAssignments.map(cloneDutyDesignAssignment),
    manualShiftAssignments: draft.manualShiftAssignments.map(cloneManualShiftAssignment),
    baseBiasSnapshot: draft.baseBiasSnapshot.map(cloneBiasLedger),
    currentBiasSnapshot: draft.currentBiasSnapshot.map(cloneBiasLedger)
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

export class InMemoryRosterWizardDraftRepository
  implements RosterWizardDraftRepository
{
  private readonly draftsById = new Map<string, RosterWizardDraft>();

  constructor(seedData: ReadonlyArray<RosterWizardDraft> = []) {
    seedData.forEach((draft) => {
      this.draftsById.set(draft.id, cloneDraft(draft));
    });
  }

  async list(
    filter?: RosterWizardDraftRepositoryFilter
  ): Promise<ReadonlyArray<RosterWizardDraft>> {
    return sortDrafts(
      Array.from(this.draftsById.values()).filter((draft) => {
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
    const draft = this.draftsById.get(id);
    return draft ? cloneDraft(draft) : null;
  }

  async save(draft: RosterWizardDraft): Promise<RosterWizardDraft> {
    this.draftsById.set(draft.id, cloneDraft(draft));
    return cloneDraft(draft);
  }

  async delete(id: string): Promise<void> {
    this.draftsById.delete(id);
  }
}
