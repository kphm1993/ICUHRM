import type { ActorRole } from "@/domain/models";
import { DEFAULT_DUTY_LOCATION_ID } from "@/domain/models";
import { createBiasCriteriaManagementService } from "@/features/admin/services/biasCriteriaManagementService";
import { createDutyLocationManagementService } from "@/features/admin/services/dutyLocationManagementService";
import { createRosterWorkflowService } from "@/features/roster/services/rosterWorkflowService";
import { createAuditLogService } from "@/features/audit/services/auditLogService";
import { createBiasManagementService } from "@/features/fairness/services/biasManagementService";
import { createDoctorManagementService } from "@/features/doctors/services/doctorManagementService";
import { createLeaveManagementService } from "@/features/leaves/services/leaveManagementService";
import { createOffRequestService } from "@/features/offRequests/services/offRequestService";
import { createShiftTypeManagementService } from "@/features/shifts/services/shiftTypeManagementService";
import {
  ROSTER_SEED_BIAS_LEDGERS,
  ROSTER_SEED_DUTY_LOCATIONS,
  ROSTER_SEED_DOCTORS,
  ROSTER_SEED_LEAVES,
  ROSTER_SEED_OFF_REQUESTS,
  ROSTER_SEED_SHIFT_TYPES,
  ROSTER_SEED_WEEKDAY_PAIR_BIAS_LEDGERS
} from "@/app/seed/rosterSeedData";
import {
  InMemoryBiasCriteriaRepository,
  InMemoryBiasLedgerRepository,
  InMemoryDoctorRepository,
  InMemoryDutyLocationRepository,
  InMemoryLeaveRepository,
  InMemoryShiftTypeRepository,
  InMemoryWeekdayPairBiasLedgerRepository
} from "@/infrastructure/repositories/inMemory";
import {
  LocalStorageAuditLogRepository,
  LocalStorageBiasLedgerRepository,
  LocalStorageOffRequestRepository,
  LocalStorageRosterSnapshotRepository,
  LocalStorageWeekdayPairBiasLedgerRepository,
  removeStorageCollection
} from "@/infrastructure/repositories/browserStorage";

const EXAMPLE_BIAS_CRITERIA = [
  {
    id: "criteria-day-all",
    code: "DAY_ALL",
    label: "All Day Shifts",
    locationIds: [DEFAULT_DUTY_LOCATION_ID],
    shiftTypeIds: ["shift-type-day"],
    weekdayConditions: [],
    isWeekendOnly: false,
    isActive: true,
    isLocked: false,
    createdAt: "2026-04-01T00:00:00.000Z",
    updatedAt: "2026-04-01T00:00:00.000Z",
    createdByActorId: "user-admin-demo",
    updatedByActorId: "user-admin-demo"
  },
  {
    id: "criteria-night-all",
    code: "NIGHT_ALL",
    label: "All Night Shifts",
    locationIds: [DEFAULT_DUTY_LOCATION_ID],
    shiftTypeIds: ["shift-type-night"],
    weekdayConditions: [],
    isWeekendOnly: false,
    isActive: true,
    isLocked: false,
    createdAt: "2026-04-01T00:00:00.000Z",
    updatedAt: "2026-04-01T00:00:00.000Z",
    createdByActorId: "user-admin-demo",
    updatedByActorId: "user-admin-demo"
  }
] as const;

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
  const auditLogService = createAuditLogService({
    auditLogRepository
  });
  const biasCriteriaRepository = new InMemoryBiasCriteriaRepository(
    EXAMPLE_BIAS_CRITERIA
  );
  const doctorRepository = new InMemoryDoctorRepository(ROSTER_SEED_DOCTORS);
  const dutyLocationRepository = new InMemoryDutyLocationRepository(
    ROSTER_SEED_DUTY_LOCATIONS
  );
  const biasCriteriaManagementService = createBiasCriteriaManagementService({
    biasCriteriaRepository,
    biasLedgerRepository,
    doctorRepository,
    rosterSnapshotRepository,
    auditLogService
  });
  const dutyLocationManagementService = createDutyLocationManagementService({
    dutyLocationRepository,
    biasCriteriaRepository,
    rosterSnapshotRepository,
    auditLogService
  });

  const workflowService = createRosterWorkflowService({
    biasCriteriaManagementService,
    doctorManagementService: createDoctorManagementService({
      doctorRepository,
      leaveRepository: new InMemoryLeaveRepository(ROSTER_SEED_LEAVES),
      offRequestRepository,
      biasLedgerRepository: new InMemoryBiasLedgerRepository(ROSTER_SEED_BIAS_LEDGERS),
      weekdayPairBiasLedgerRepository: new InMemoryWeekdayPairBiasLedgerRepository(
        ROSTER_SEED_WEEKDAY_PAIR_BIAS_LEDGERS
      ),
      rosterSnapshotRepository,
      auditLogService
    }),
    dutyLocationManagementService,
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
      biasCriteriaRepository,
      biasLedgerRepository,
      weekdayPairBiasLedgerRepository
    }),
    biasLedgerRepository,
    weekdayPairBiasLedgerRepository,
    rosterSnapshotRepository,
    auditLogService
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
