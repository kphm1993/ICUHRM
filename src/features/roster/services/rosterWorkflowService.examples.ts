import type { ActorRole } from "@/domain/models";
import { createRosterWorkflowService } from "@/features/roster/services/rosterWorkflowService";
import { createAuditLogService } from "@/features/audit/services/auditLogService";
import { createBiasManagementService } from "@/features/fairness/services/biasManagementService";
import { createDoctorManagementService } from "@/features/doctors/services/doctorManagementService";
import { createLeaveManagementService } from "@/features/leaves/services/leaveManagementService";
import { createOffRequestService } from "@/features/offRequests/services/offRequestService";
import { createShiftTypeManagementService } from "@/features/shifts/services/shiftTypeManagementService";
import {
  ROSTER_SEED_BIAS_LEDGERS,
  ROSTER_SEED_DOCTORS,
  ROSTER_SEED_LEAVES,
  ROSTER_SEED_OFF_REQUESTS,
  ROSTER_SEED_SHIFT_TYPES,
  ROSTER_SEED_WEEKDAY_PAIR_BIAS_LEDGERS
} from "@/app/seed/rosterSeedData";
import {
  InMemoryDoctorRepository,
  InMemoryLeaveRepository,
  InMemoryShiftTypeRepository
} from "@/infrastructure/repositories/inMemory";
import {
  LocalStorageAuditLogRepository,
  LocalStorageBiasLedgerRepository,
  LocalStorageOffRequestRepository,
  LocalStorageRosterSnapshotRepository,
  LocalStorageWeekdayPairBiasLedgerRepository,
  removeStorageCollection
} from "@/infrastructure/repositories/browserStorage";

function createExampleWorkflow(storageKeyPrefix: string) {
  const rosterSnapshotRepository = new LocalStorageRosterSnapshotRepository({
    storageKey: `${storageKeyPrefix}:roster-snapshots`
  });
  const auditLogRepository = new LocalStorageAuditLogRepository({
    storageKey: `${storageKeyPrefix}:audit-logs`
  });
  const biasLedgerRepository = new LocalStorageBiasLedgerRepository({
    storageKey: `${storageKeyPrefix}:bias-ledgers`,
    seedData: ROSTER_SEED_BIAS_LEDGERS
  });
  const weekdayPairBiasLedgerRepository =
    new LocalStorageWeekdayPairBiasLedgerRepository({
      storageKey: `${storageKeyPrefix}:weekday-pair-bias-ledgers`,
      seedData: ROSTER_SEED_WEEKDAY_PAIR_BIAS_LEDGERS
    });
  const offRequestRepository = new LocalStorageOffRequestRepository({
    storageKey: `${storageKeyPrefix}:off-requests`,
    seedData: ROSTER_SEED_OFF_REQUESTS
  });

  const workflowService = createRosterWorkflowService({
    doctorManagementService: createDoctorManagementService({
      doctorRepository: new InMemoryDoctorRepository(ROSTER_SEED_DOCTORS)
    }),
    leaveManagementService: createLeaveManagementService({
      leaveRepository: new InMemoryLeaveRepository(ROSTER_SEED_LEAVES)
    }),
    shiftTypeManagementService: createShiftTypeManagementService({
      shiftTypeRepository: new InMemoryShiftTypeRepository(ROSTER_SEED_SHIFT_TYPES)
    }),
    offRequestService: createOffRequestService({
      offRequestRepository,
      rosterSnapshotRepository
    }),
    biasManagementService: createBiasManagementService({
      biasLedgerRepository,
      weekdayPairBiasLedgerRepository
    }),
    biasLedgerRepository,
    weekdayPairBiasLedgerRepository,
    rosterSnapshotRepository,
    auditLogService: createAuditLogService({
      auditLogRepository
    })
  });

  return {
    workflowService,
    cleanup() {
      removeStorageCollection(`${storageKeyPrefix}:roster-snapshots`);
      removeStorageCollection(`${storageKeyPrefix}:audit-logs`);
      removeStorageCollection(`${storageKeyPrefix}:bias-ledgers`);
      removeStorageCollection(`${storageKeyPrefix}:weekday-pair-bias-ledgers`);
      removeStorageCollection(`${storageKeyPrefix}:off-requests`);
    }
  };
}

export async function runRosterWorkflowSmokeExample(
  actorId = "user-admin-demo",
  actorRole: ActorRole = "ADMIN"
) {
  const storageKeyPrefix = `icu-hrm-smoke-${crypto.randomUUID()}`;
  const { workflowService, cleanup } = createExampleWorkflow(storageKeyPrefix);

  try {
    const draft = await workflowService.generateDraft({
      rosterMonth: "2026-04",
      firstWeekendOffGroup: "A",
      actorId,
      actorRole
    });
    const published = await workflowService.publishDraft({
      draftRosterId: draft.roster.id,
      actorId,
      actorRole
    });
    const locked = await workflowService.lockPublishedRoster({
      publishedRosterId: published.roster.id,
      actorId,
      actorRole
    });
    const monthContext = await workflowService.getMonthContext({
      rosterMonth: "2026-04",
      firstWeekendOffGroup: "A"
    });

    return {
      draftStatus: draft.roster.status,
      publishedStatus: published.roster.status,
      lockedStatus: locked.roster.status,
      activeOfficialStatus: monthContext.activeOfficial?.roster.status ?? null,
      snapshotStatuses: monthContext.snapshots.map((snapshot) => snapshot.roster.status)
    };
  } finally {
    cleanup();
  }
}
