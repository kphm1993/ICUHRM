import { createContext, useContext, useState } from "react";
import {
  ROSTER_SEED_AUDIT_LOGS,
  ROSTER_SEED_BIAS_CRITERIA,
  ROSTER_SEED_BIAS_LEDGERS,
  ROSTER_SEED_DOCTORS,
  ROSTER_SEED_DUTY_LOCATIONS,
  ROSTER_SEED_LEAVES,
  ROSTER_SEED_OFF_REQUESTS,
  ROSTER_SEED_ROSTER_SNAPSHOTS,
  ROSTER_SEED_SHIFT_TYPES,
  ROSTER_SEED_WEEKDAY_PAIR_BIAS_LEDGERS
} from "@/app/seed/rosterSeedData";
import { createBiasCriteriaManagementService } from "@/features/admin/services/biasCriteriaManagementService";
import { createDutyLocationManagementService } from "@/features/admin/services/dutyLocationManagementService";
import { createAuditLogService } from "@/features/audit/services/auditLogService";
import { createDoctorManagementService } from "@/features/doctors/services/doctorManagementService";
import { createBiasManagementService } from "@/features/fairness/services/biasManagementService";
import { createLeaveManagementService } from "@/features/leaves/services/leaveManagementService";
import { createOffRequestService } from "@/features/offRequests/services/offRequestService";
import { createRosterWorkflowService } from "@/features/roster/services/rosterWorkflowService";
import { createShiftTypeManagementService } from "@/features/shifts/services/shiftTypeManagementService";
import {
  InMemoryLeaveRepository,
  InMemoryShiftTypeRepository
} from "@/infrastructure/repositories/inMemory";
import {
  LocalStorageAuditLogRepository,
  LocalStorageBiasCriteriaRepository,
  LocalStorageBiasLedgerRepository,
  LocalStorageDoctorRepository,
  LocalStorageDutyLocationRepository,
  LocalStorageOffRequestRepository,
  LocalStorageRosterSnapshotRepository,
  LocalStorageWeekdayPairBiasLedgerRepository
} from "@/infrastructure/repositories/browserStorage";

export interface AppServices {
  readonly auditLogService: ReturnType<typeof createAuditLogService>;
  readonly biasManagementService: ReturnType<typeof createBiasManagementService>;
  readonly biasCriteriaManagementService: ReturnType<
    typeof createBiasCriteriaManagementService
  >;
  readonly doctorManagementService: ReturnType<typeof createDoctorManagementService>;
  readonly dutyLocationManagementService: ReturnType<
    typeof createDutyLocationManagementService
  >;
  readonly leaveManagementService: ReturnType<typeof createLeaveManagementService>;
  readonly offRequestService: ReturnType<typeof createOffRequestService>;
  readonly rosterWorkflowService: ReturnType<typeof createRosterWorkflowService>;
  readonly shiftTypeManagementService: ReturnType<typeof createShiftTypeManagementService>;
}

function createAppRepositories() {
  return {
    doctorRepository: new LocalStorageDoctorRepository({
      seedData: ROSTER_SEED_DOCTORS
    }),
    dutyLocationRepository: new LocalStorageDutyLocationRepository({
      seedData: ROSTER_SEED_DUTY_LOCATIONS
    }),
    biasCriteriaRepository: new LocalStorageBiasCriteriaRepository({
      seedData: ROSTER_SEED_BIAS_CRITERIA
    }),
    leaveRepository: new InMemoryLeaveRepository(ROSTER_SEED_LEAVES),
    shiftTypeRepository: new InMemoryShiftTypeRepository(ROSTER_SEED_SHIFT_TYPES),
    rosterSnapshotRepository: new LocalStorageRosterSnapshotRepository({
      seedData: ROSTER_SEED_ROSTER_SNAPSHOTS
    }),
    auditLogRepository: new LocalStorageAuditLogRepository({
      seedData: ROSTER_SEED_AUDIT_LOGS
    }),
    offRequestRepository: new LocalStorageOffRequestRepository({
      seedData: ROSTER_SEED_OFF_REQUESTS
    }),
    biasLedgerRepository: new LocalStorageBiasLedgerRepository({
      seedData: ROSTER_SEED_BIAS_LEDGERS
    }),
    weekdayPairBiasLedgerRepository: new LocalStorageWeekdayPairBiasLedgerRepository({
      seedData: ROSTER_SEED_WEEKDAY_PAIR_BIAS_LEDGERS
    })
  };
}

function createAppServices(): AppServices {
  const repositories = createAppRepositories();
  const auditLogService = createAuditLogService({
    auditLogRepository: repositories.auditLogRepository
  });

  const dutyLocationManagementService = createDutyLocationManagementService({
    dutyLocationRepository: repositories.dutyLocationRepository,
    biasCriteriaRepository: repositories.biasCriteriaRepository,
    rosterSnapshotRepository: repositories.rosterSnapshotRepository,
    auditLogService
  });
  const biasCriteriaManagementService = createBiasCriteriaManagementService({
    biasCriteriaRepository: repositories.biasCriteriaRepository,
    biasLedgerRepository: repositories.biasLedgerRepository,
    doctorRepository: repositories.doctorRepository,
    rosterSnapshotRepository: repositories.rosterSnapshotRepository,
    auditLogService
  });
  const doctorManagementService = createDoctorManagementService({
    doctorRepository: repositories.doctorRepository,
    leaveRepository: repositories.leaveRepository,
    offRequestRepository: repositories.offRequestRepository,
    biasLedgerRepository: repositories.biasLedgerRepository,
    weekdayPairBiasLedgerRepository: repositories.weekdayPairBiasLedgerRepository,
    rosterSnapshotRepository: repositories.rosterSnapshotRepository,
    auditLogService
  });
  const leaveManagementService = createLeaveManagementService({
    leaveRepository: repositories.leaveRepository
  });
  const shiftTypeManagementService = createShiftTypeManagementService({
    shiftTypeRepository: repositories.shiftTypeRepository
  });
  const offRequestService = createOffRequestService({
    offRequestRepository: repositories.offRequestRepository,
    rosterSnapshotRepository: repositories.rosterSnapshotRepository
  });
  const biasManagementService = createBiasManagementService({
    biasCriteriaRepository: repositories.biasCriteriaRepository,
    biasLedgerRepository: repositories.biasLedgerRepository,
    weekdayPairBiasLedgerRepository: repositories.weekdayPairBiasLedgerRepository
  });
  const rosterWorkflowService = createRosterWorkflowService({
    biasCriteriaManagementService,
    doctorManagementService,
    dutyLocationManagementService,
    leaveManagementService,
    shiftTypeManagementService,
    offRequestService,
    biasManagementService,
    biasLedgerRepository: repositories.biasLedgerRepository,
    weekdayPairBiasLedgerRepository: repositories.weekdayPairBiasLedgerRepository,
    rosterSnapshotRepository: repositories.rosterSnapshotRepository,
    auditLogService
  });

  return {
    auditLogService,
    biasManagementService,
    biasCriteriaManagementService,
    doctorManagementService,
    dutyLocationManagementService,
    leaveManagementService,
    offRequestService,
    rosterWorkflowService,
    shiftTypeManagementService
  };
}

const AppServicesContext = createContext<AppServices | null>(null);

export function AppServicesProvider({
  children
}: {
  readonly children: React.ReactNode;
}) {
  const [services] = useState(createAppServices);

  return (
    <AppServicesContext.Provider value={services}>
      {children}
    </AppServicesContext.Provider>
  );
}

export function useAppServices(): AppServices {
  const context = useContext(AppServicesContext);

  if (!context) {
    throw new Error("useAppServices must be used within AppServicesProvider.");
  }

  return context;
}
