import {
  ROSTER_SEED_BIAS_LEDGERS,
  ROSTER_SEED_BIAS_CRITERIA,
  ROSTER_SEED_DOCTORS,
  ROSTER_SEED_LEAVES,
  ROSTER_SEED_OFF_REQUESTS,
  ROSTER_SEED_WEEKDAY_PAIR_BIAS_LEDGERS
} from "@/app/seed/rosterSeedData";
import type {
  Doctor,
  RosterSnapshot
} from "@/domain/models";
import { createAuditLogService } from "@/features/audit/services/auditLogService";
import { createDoctorManagementService } from "@/features/doctors/services/doctorManagementService";
import { buildRosterDoctorSummaryRows } from "@/features/roster/selectors/rosterReviewSelectors";
import {
  InMemoryBiasLedgerRepository,
  InMemoryLeaveRepository,
  InMemoryWeekdayPairBiasLedgerRepository
} from "@/infrastructure/repositories/inMemory";
import {
  LocalStorageAuditLogRepository,
  LocalStorageDoctorRepository,
  LocalStorageOffRequestRepository,
  LocalStorageRosterSnapshotRepository,
  removeStorageCollection
} from "@/infrastructure/repositories/browserStorage";

function createDoctorManagementExampleServices(storageKeyPrefix: string) {
  const doctorRepository = new LocalStorageDoctorRepository({
    storageKey: `${storageKeyPrefix}:doctors`,
    seedData: ROSTER_SEED_DOCTORS
  });
  const offRequestRepository = new LocalStorageOffRequestRepository({
    storageKey: `${storageKeyPrefix}:off-requests`,
    seedData: ROSTER_SEED_OFF_REQUESTS
  });
  const rosterSnapshotRepository = new LocalStorageRosterSnapshotRepository({
    storageKey: `${storageKeyPrefix}:roster-snapshots`
  });
  const auditLogRepository = new LocalStorageAuditLogRepository({
    storageKey: `${storageKeyPrefix}:audit-logs`
  });
  const auditLogService = createAuditLogService({
    auditLogRepository
  });

  const doctorManagementService = createDoctorManagementService({
    doctorRepository,
    leaveRepository: new InMemoryLeaveRepository(ROSTER_SEED_LEAVES),
    offRequestRepository,
    biasLedgerRepository: new InMemoryBiasLedgerRepository(ROSTER_SEED_BIAS_LEDGERS),
    weekdayPairBiasLedgerRepository: new InMemoryWeekdayPairBiasLedgerRepository(
      ROSTER_SEED_WEEKDAY_PAIR_BIAS_LEDGERS
    ),
    rosterSnapshotRepository,
    auditLogService
  });

  return {
    doctorRepository,
    auditLogService,
    doctorManagementService,
    cleanup() {
      removeStorageCollection(`${storageKeyPrefix}:doctors`);
      removeStorageCollection(`${storageKeyPrefix}:off-requests`);
      removeStorageCollection(`${storageKeyPrefix}:roster-snapshots`);
      removeStorageCollection(`${storageKeyPrefix}:audit-logs`);
    }
  };
}

export async function runDoctorRepositoryPersistenceExample() {
  const storageKey = `icu-hrm-doctor-persistence-${crypto.randomUUID()}`;
  const firstRepository = new LocalStorageDoctorRepository({
    storageKey,
    seedData: []
  });

  try {
    const timestamp = "2026-04-02T10:00:00.000Z";
    const savedDoctor = await firstRepository.save({
      id: "doctor-example",
      userId: "user-example",
      name: "Dr. Example",
      phoneNumber: "0719999999",
      uniqueIdentifier: "doctor.example",
      weekendGroup: "A",
      isActive: true,
      createdAt: timestamp,
      updatedAt: timestamp
    });

    const secondRepository = new LocalStorageDoctorRepository({
      storageKey,
      seedData: []
    });
    const listedDoctors = await secondRepository.list();

    return {
      savedDoctor,
      listedDoctors
    };
  } finally {
    removeStorageCollection(storageKey);
  }
}

export async function runDoctorManagementServiceExamples() {
  const storageKeyPrefix = `icu-hrm-doctor-service-${crypto.randomUUID()}`;
  const { auditLogService, doctorManagementService, cleanup } =
    createDoctorManagementExampleServices(storageKeyPrefix);

  try {
    const createdDoctor = await doctorManagementService.createDoctor({
      name: "Dr. Shanika Silva",
      phoneNumber: "0711234567",
      uniqueIdentifier: "shanika.silva",
      weekendGroup: "B",
      temporaryPassword: "Temp-Doctor-123",
      actorId: "user-admin-demo",
      actorRole: "ADMIN"
    });

    const updatedDoctor = await doctorManagementService.updateDoctor(createdDoctor.id, {
      name: "Dr. Shanika Silva",
      phoneNumber: "0717654321",
      uniqueIdentifier: "shanika.silva",
      weekendGroup: "A",
      actorId: "user-admin-demo",
      actorRole: "ADMIN"
    });

    const deactivatedDoctor = await doctorManagementService.deactivateDoctor(
      updatedDoctor.id,
      {
        actorId: "user-admin-demo",
        actorRole: "ADMIN"
      }
    );

    const reactivatedDoctor = await doctorManagementService.activateDoctor(
      updatedDoctor.id,
      {
        actorId: "user-admin-demo",
        actorRole: "ADMIN"
      }
    );

    let blockedDeleteMessage: string | null = null;
    try {
      await doctorManagementService.deleteDoctor("doctor-demo", {
        actorId: "user-admin-demo",
        actorRole: "ADMIN"
      });
    } catch (error) {
      blockedDeleteMessage =
        error instanceof Error ? error.message : "Delete should have been blocked.";
    }

    await doctorManagementService.deleteDoctor(createdDoctor.id, {
      actorId: "user-admin-demo",
      actorRole: "ADMIN"
    });

    const auditLogs = await auditLogService.listLogs({
      entityType: "DOCTOR"
    });

    return {
      createdDoctor,
      updatedDoctor,
      deactivatedDoctor,
      reactivatedDoctor,
      blockedDeleteMessage,
      auditActions: auditLogs.map((entry) => entry.actionType)
    };
  } finally {
    cleanup();
  }
}

export function runHistoricalDoctorReferenceExample() {
  const currentDoctors: ReadonlyArray<Doctor> = [
    {
      id: "doctor-history",
      userId: "user-history",
      name: "Dr. Renamed Current",
      phoneNumber: "0710000100",
      uniqueIdentifier: "doctor.history",
      weekendGroup: "A",
      isActive: false,
      createdAt: "2026-03-01T00:00:00.000Z",
      updatedAt: "2026-04-02T00:00:00.000Z"
    }
  ];

  const snapshot: RosterSnapshot = {
    roster: {
      id: "roster-history",
      period: {
        startDate: "2026-03-01",
        endDate: "2026-03-31"
      },
      status: "LOCKED",
      isDeleted: false,
      createdAt: "2026-03-28T10:00:00.000Z",
      createdByUserId: "user-admin-demo",
      generatedAt: "2026-03-28T10:00:00.000Z",
      publishedAt: "2026-03-29T10:00:00.000Z",
      lockedAt: "2026-03-30T10:00:00.000Z",
      weekendGroupSchedule: []
    },
    doctorReferences: [
      {
        doctorId: "doctor-history",
        name: "Dr. Historical Name",
        uniqueIdentifier: "doctor.history",
        weekendGroup: "A",
        isActive: true
      }
    ],
    shifts: [],
    assignments: [],
    warnings: [],
    validation: {
      isValid: true,
      issues: []
    },
    updatedBias: [],
    generatedInputSummary: {
      rosterMonth: "2026-03",
      range: {
        startDate: "2026-03-01",
        endDate: "2026-03-31"
      },
      activeDoctorCount: 1,
      leaveCount: 0,
      offRequestCount: 0,
      shiftTypeCount: 2,
      firstWeekendOffGroup: "A",
      weekendGroupSchedule: [],
      activeBiasCriteria: ROSTER_SEED_BIAS_CRITERIA,
      activeDutyLocations: []
    }
  };

  const rows = buildRosterDoctorSummaryRows({
    doctors: currentDoctors,
    snapshot,
    currentBias: [],
    currentWeekdayPairBias: [],
    activeBiasCriteria: []
  });

  return {
    currentDoctorName: currentDoctors[0]?.name ?? null,
    historicalDoctorName: rows[0]?.doctorName ?? null
  };
}
