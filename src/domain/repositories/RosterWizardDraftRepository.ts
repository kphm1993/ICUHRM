import type {
  EntityId,
  RosterWizardDraft,
  RosterWizardDraftStatus,
  YearMonthString
} from "@/domain/models";

export interface RosterWizardDraftRepositoryFilter {
  readonly createdByActorId?: EntityId;
  readonly rosterMonth?: YearMonthString;
  readonly statuses?: ReadonlyArray<RosterWizardDraftStatus>;
}

export interface RosterWizardDraftRepository {
  list(
    filter?: RosterWizardDraftRepositoryFilter
  ): Promise<ReadonlyArray<RosterWizardDraft>>;
  findById(id: EntityId): Promise<RosterWizardDraft | null>;
  save(draft: RosterWizardDraft): Promise<RosterWizardDraft>;
  delete(id: EntityId): Promise<void>;
}
