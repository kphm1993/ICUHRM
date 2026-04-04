import type {
  ActorRole,
  BiasLedger,
  EntityId,
  RosterWizardDraft,
  RosterWizardStep,
  YearMonthString
} from "@/domain/models";
import type { RosterWizardDraftRepository } from "@/domain/repositories";
import { RepositoryNotFoundError } from "@/domain/repositories";
import { assertAdminActorRole } from "@/features/admin/services/assertAdminActorRole";
import type { AuditLogService } from "@/features/audit/services/auditLogService";
import { logRosterWizardDraftLifecycleEvent } from "@/features/audit/services/lifecycleAuditLogging";
import type { BiasManagementService } from "@/features/fairness/services/biasManagementService";

type RosterWizardDraftChanges = Partial<
  Omit<
    RosterWizardDraft,
    "id" | "createdByActorId" | "createdAt" | "updatedAt" | "status" | "currentStep"
  >
>;

export interface CreateRosterWizardDraftInput {
  readonly rosterMonth: YearMonthString;
  readonly name?: string;
  readonly actorId: EntityId;
  readonly actorRole: ActorRole;
}

export interface SaveRosterWizardDraftStepInput {
  readonly draftId: EntityId;
  readonly currentStep: RosterWizardStep;
  readonly changes?: RosterWizardDraftChanges;
  readonly actorId: EntityId;
  readonly actorRole: ActorRole;
}

export interface LoadRosterWizardDraftInput {
  readonly draftId: EntityId;
  readonly actorId: EntityId;
  readonly actorRole: ActorRole;
}

export interface ListRosterWizardDraftsInput {
  readonly actorId: EntityId;
  readonly actorRole: ActorRole;
  readonly rosterMonth?: YearMonthString;
  readonly statuses?: ReadonlyArray<RosterWizardDraft["status"]>;
}

export interface UpdateRosterWizardDraftStatusInput {
  readonly draftId: EntityId;
  readonly actorId: EntityId;
  readonly actorRole: ActorRole;
}

export interface DeleteRosterWizardDraftInput {
  readonly draftId: EntityId;
  readonly actorId: EntityId;
  readonly actorRole: ActorRole;
}

export interface RosterWizardService {
  createDraft(input: CreateRosterWizardDraftInput): Promise<RosterWizardDraft>;
  saveDraftStep(input: SaveRosterWizardDraftStepInput): Promise<RosterWizardDraft>;
  loadDraftById(input: LoadRosterWizardDraftInput): Promise<RosterWizardDraft>;
  listDraftsByAdmin(
    input: ListRosterWizardDraftsInput
  ): Promise<ReadonlyArray<RosterWizardDraft>>;
  publishDraft(
    input: UpdateRosterWizardDraftStatusInput
  ): Promise<RosterWizardDraft>;
  lockDraft(input: UpdateRosterWizardDraftStatusInput): Promise<RosterWizardDraft>;
  unlockDraft(
    input: UpdateRosterWizardDraftStatusInput
  ): Promise<RosterWizardDraft>;
  deleteDraft(input: DeleteRosterWizardDraftInput): Promise<void>;
}

export interface RosterWizardServiceDependencies {
  readonly rosterWizardDraftRepository: RosterWizardDraftRepository;
  readonly biasManagementService: BiasManagementService;
  readonly auditLogService: AuditLogService;
}

function cloneBiasLedger(entry: BiasLedger): BiasLedger {
  return {
    ...entry,
    balances: { ...entry.balances }
  };
}

function cloneDraft(draft: RosterWizardDraft): RosterWizardDraft {
  return {
    ...draft,
    customRange: draft.customRange ? { ...draft.customRange } : undefined,
    publicHolidayDates: [...draft.publicHolidayDates],
    groupConstraintTemplateIds: [...draft.groupConstraintTemplateIds],
    groupConstraints: draft.groupConstraints.map((constraint) => ({ ...constraint })),
    excludedDoctorPeriods: draft.excludedDoctorPeriods.map((period) => ({ ...period })),
    dutyDesignAssignments: draft.dutyDesignAssignments.map((assignment) => ({
      ...assignment
    })),
    manualShiftAssignments: draft.manualShiftAssignments.map((assignment) => ({
      ...assignment
    })),
    currentBiasSnapshot: draft.currentBiasSnapshot.map(cloneBiasLedger)
  };
}

function normalizeDraftName(name: string): string {
  const normalizedName = name.trim();

  if (!normalizedName) {
    throw new Error("Draft name is required.");
  }

  return normalizedName;
}

function buildDefaultDraftName(rosterMonth: YearMonthString): string {
  return `Roster Wizard ${rosterMonth}`;
}

function ensureStep(step: RosterWizardStep): RosterWizardStep {
  if (step === 1 || step === 2 || step === 3 || step === 4 || step === 5) {
    return step;
  }

  throw new Error("Roster wizard step is invalid.");
}

function applyDraftChanges(
  draft: RosterWizardDraft,
  changes: RosterWizardDraftChanges | undefined,
  currentStep: RosterWizardStep
): RosterWizardDraft {
  return {
    ...draft,
    name:
      changes?.name !== undefined ? normalizeDraftName(changes.name) : draft.name,
    rosterMonth: changes?.rosterMonth ?? draft.rosterMonth,
    customRange:
      changes?.customRange !== undefined
        ? changes.customRange
          ? { ...changes.customRange }
          : undefined
        : draft.customRange
          ? { ...draft.customRange }
          : undefined,
    publicHolidayDates: [
      ...(changes?.publicHolidayDates ?? draft.publicHolidayDates)
    ],
    groupConstraintTemplateIds: [
      ...(changes?.groupConstraintTemplateIds ?? draft.groupConstraintTemplateIds)
    ],
    groupConstraints: (
      changes?.groupConstraints ?? draft.groupConstraints
    ).map((constraint) => ({ ...constraint })),
    excludedDoctorPeriods: (
      changes?.excludedDoctorPeriods ?? draft.excludedDoctorPeriods
    ).map((period) => ({ ...period })),
    dutyDesignAssignments: (
      changes?.dutyDesignAssignments ?? draft.dutyDesignAssignments
    ).map((assignment) => ({ ...assignment })),
    manualShiftAssignments: (
      changes?.manualShiftAssignments ?? draft.manualShiftAssignments
    ).map((assignment) => ({ ...assignment })),
    currentBiasSnapshot: (
      changes?.currentBiasSnapshot ?? draft.currentBiasSnapshot
    ).map(cloneBiasLedger),
    currentStep,
    updatedAt: new Date().toISOString()
  };
}

function withStatus(
  draft: RosterWizardDraft,
  status: RosterWizardDraft["status"]
): RosterWizardDraft {
  return {
    ...cloneDraft(draft),
    status,
    updatedAt: new Date().toISOString()
  };
}

async function loadOwnedDraft(
  repository: RosterWizardDraftRepository,
  draftId: EntityId,
  actorId: EntityId
): Promise<RosterWizardDraft> {
  const draft = await repository.findById(draftId);

  if (!draft || draft.createdByActorId !== actorId) {
    throw new RepositoryNotFoundError(`Roster wizard draft '${draftId}' was not found.`);
  }

  return draft;
}

export function createRosterWizardService(
  dependencies: RosterWizardServiceDependencies
): RosterWizardService {
  return {
    async createDraft(input) {
      assertAdminActorRole(
        input.actorRole,
        "You do not have permission to manage roster wizard drafts."
      );

      const timestamp = new Date().toISOString();
      const currentBiasSnapshot = await dependencies.biasManagementService.listBiasLedgers(
        input.rosterMonth
      );
      const draft: RosterWizardDraft = {
        id: crypto.randomUUID(),
        name: normalizeDraftName(input.name ?? buildDefaultDraftName(input.rosterMonth)),
        createdByActorId: input.actorId,
        createdAt: timestamp,
        updatedAt: timestamp,
        rosterMonth: input.rosterMonth,
        publicHolidayDates: [],
        groupConstraintTemplateIds: [],
        groupConstraints: [],
        excludedDoctorPeriods: [],
        dutyDesignAssignments: [],
        manualShiftAssignments: [],
        currentBiasSnapshot: currentBiasSnapshot.map(cloneBiasLedger),
        status: "DRAFT",
        currentStep: 1
      };
      const savedDraft =
        await dependencies.rosterWizardDraftRepository.save(cloneDraft(draft));

      await logRosterWizardDraftLifecycleEvent(dependencies.auditLogService, {
        actorId: input.actorId,
        actorRole: input.actorRole,
        actionType: "ROSTER_WIZARD_DRAFT_CREATED",
        draft: savedDraft
      });

      return savedDraft;
    },
    async saveDraftStep(input) {
      assertAdminActorRole(
        input.actorRole,
        "You do not have permission to manage roster wizard drafts."
      );

      const currentStep = ensureStep(input.currentStep);
      const draft = await loadOwnedDraft(
        dependencies.rosterWizardDraftRepository,
        input.draftId,
        input.actorId
      );

      if (draft.status === "LOCKED") {
        throw new Error("Locked wizard drafts must be unlocked before editing.");
      }

      const nextDraft = applyDraftChanges(draft, input.changes, currentStep);
      const savedDraft =
        await dependencies.rosterWizardDraftRepository.save(nextDraft);

      await logRosterWizardDraftLifecycleEvent(dependencies.auditLogService, {
        actorId: input.actorId,
        actorRole: input.actorRole,
        actionType: "ROSTER_WIZARD_DRAFT_UPDATED",
        draft: savedDraft
      });

      return savedDraft;
    },
    async loadDraftById(input) {
      assertAdminActorRole(
        input.actorRole,
        "You do not have permission to manage roster wizard drafts."
      );

      return loadOwnedDraft(
        dependencies.rosterWizardDraftRepository,
        input.draftId,
        input.actorId
      );
    },
    async listDraftsByAdmin(input) {
      assertAdminActorRole(
        input.actorRole,
        "You do not have permission to manage roster wizard drafts."
      );

      return dependencies.rosterWizardDraftRepository.list({
        createdByActorId: input.actorId,
        rosterMonth: input.rosterMonth,
        statuses: input.statuses
      });
    },
    async publishDraft(input) {
      assertAdminActorRole(
        input.actorRole,
        "You do not have permission to manage roster wizard drafts."
      );

      const draft = await loadOwnedDraft(
        dependencies.rosterWizardDraftRepository,
        input.draftId,
        input.actorId
      );

      if (draft.status !== "DRAFT") {
        throw new RepositoryNotFoundError(
          `Draft roster wizard '${input.draftId}' was not found.`
        );
      }

      const savedDraft = await dependencies.rosterWizardDraftRepository.save(
        withStatus(draft, "PUBLISHED")
      );

      await logRosterWizardDraftLifecycleEvent(dependencies.auditLogService, {
        actorId: input.actorId,
        actorRole: input.actorRole,
        actionType: "ROSTER_WIZARD_DRAFT_PUBLISHED",
        draft: savedDraft,
        extraDetails: {
          previousStatus: "DRAFT",
          nextStatus: "PUBLISHED"
        }
      });

      return savedDraft;
    },
    async lockDraft(input) {
      assertAdminActorRole(
        input.actorRole,
        "You do not have permission to manage roster wizard drafts."
      );

      const draft = await loadOwnedDraft(
        dependencies.rosterWizardDraftRepository,
        input.draftId,
        input.actorId
      );

      if (draft.status !== "PUBLISHED") {
        throw new RepositoryNotFoundError(
          `Published roster wizard '${input.draftId}' was not found.`
        );
      }

      const savedDraft = await dependencies.rosterWizardDraftRepository.save(
        withStatus(draft, "LOCKED")
      );

      await logRosterWizardDraftLifecycleEvent(dependencies.auditLogService, {
        actorId: input.actorId,
        actorRole: input.actorRole,
        actionType: "ROSTER_WIZARD_DRAFT_LOCKED",
        draft: savedDraft,
        extraDetails: {
          previousStatus: "PUBLISHED",
          nextStatus: "LOCKED"
        }
      });

      return savedDraft;
    },
    async unlockDraft(input) {
      assertAdminActorRole(
        input.actorRole,
        "You do not have permission to manage roster wizard drafts."
      );

      const draft = await loadOwnedDraft(
        dependencies.rosterWizardDraftRepository,
        input.draftId,
        input.actorId
      );

      if (draft.status !== "LOCKED") {
        throw new Error("Only locked wizard drafts can be unlocked.");
      }

      const savedDraft = await dependencies.rosterWizardDraftRepository.save(
        withStatus(draft, "PUBLISHED")
      );

      await logRosterWizardDraftLifecycleEvent(dependencies.auditLogService, {
        actorId: input.actorId,
        actorRole: input.actorRole,
        actionType: "ROSTER_WIZARD_DRAFT_UNLOCKED",
        draft: savedDraft,
        extraDetails: {
          previousStatus: "LOCKED",
          nextStatus: "PUBLISHED"
        }
      });

      return savedDraft;
    },
    async deleteDraft(input) {
      assertAdminActorRole(
        input.actorRole,
        "You do not have permission to manage roster wizard drafts."
      );

      const draft = await loadOwnedDraft(
        dependencies.rosterWizardDraftRepository,
        input.draftId,
        input.actorId
      );

      await dependencies.rosterWizardDraftRepository.delete(input.draftId);

      await logRosterWizardDraftLifecycleEvent(dependencies.auditLogService, {
        actorId: input.actorId,
        actorRole: input.actorRole,
        actionType: "ROSTER_WIZARD_DRAFT_DELETED",
        draft
      });
    }
  };
}
