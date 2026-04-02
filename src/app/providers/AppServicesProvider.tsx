import { createContext, useContext, useState } from "react";
import {
  ROSTER_SEED_AUDIT_LOGS,
  ROSTER_SEED_BIAS_LEDGERS,
  ROSTER_SEED_DOCTORS,
  ROSTER_SEED_LEAVES,
  ROSTER_SEED_OFF_REQUESTS,
  ROSTER_SEED_ROSTER_SNAPSHOTS,
  ROSTER_SEED_SHIFT_TYPES,
  ROSTER_SEED_WEEKDAY_PAIR_BIAS_LEDGERS
} from "@/app/seed/rosterSeedData";
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
  LocalStorageBiasLedgerRepository,
  LocalStorageDoctorRepository,
  LocalStorageOffRequestRepository,
  LocalStorageRosterSnapshotRepository,
  LocalStorageWeekdayPairBiasLedgerRepository
} from "@/infrastructure/repositories/browserStorage";

export interface AppServices {
  readonly auditLogService: ReturnType<typeof createAuditLogService>;
  readonly biasManagementService: ReturnType<typeof createBiasManagementService>;
  readonly doctorManagementService: ReturnType<typeof createDoctorManagementService>;
  readonly leaveManagementService: ReturnType<typeof createLeaveManagementService>;
  readonly offRequestService: ReturnType<typeof createOffRequestService>;
  readonly rosterWorkflowService: ReturnType<typeof createRosterWorkflowService>;
  readonly shiftTypeManagementService: ReturnType<typeof createShiftTypeManagementService>;
}

function createAppServices(): AppServices {
  const doctorRepository = new LocalStorageDoctorRepository({
    seedData: ROSTER_SEED_DOCTORS
  });
  const leaveRepository = new InMemoryLeaveRepository(ROSTER_SEED_LEAVES);
  const shiftTypeRepository = new InMemoryShiftTypeRepository(ROSTER_SEED_SHIFT_TYPES);
  const rosterSnapshotRepository = new LocalStorageRosterSnapshotRepository({
    seedData: ROSTER_SEED_ROSTER_SNAPSHOTS
  });
  const auditLogRepository = new LocalStorageAuditLogRepository({
    seedData: ROSTER_SEED_AUDIT_LOGS
  });
  const offRequestRepository = new LocalStorageOffRequestRepository({
    seedData: ROSTER_SEED_OFF_REQUESTS
  });
  const biasLedgerRepository = new LocalStorageBiasLedgerRepository({
    seedData: ROSTER_SEED_BIAS_LEDGERS
  });
  const weekdayPairBiasLedgerRepository =
    new LocalStorageWeekdayPairBiasLedgerRepository({
      seedData: ROSTER_SEED_WEEKDAY_PAIR_BIAS_LEDGERS
    });
  const auditLogService = createAuditLogService({
    auditLogRepository
  });

  const doctorManagementService = createDoctorManagementService({
    doctorRepository,
    leaveRepository,
    offRequestRepository,
    biasLedgerRepository,
    weekdayPairBiasLedgerRepository,
    rosterSnapshotRepository,
    auditLogService
  });
  const leaveManagementService = createLeaveManagementService({
    leaveRepository
  });
  const shiftTypeManagementService = createShiftTypeManagementService({
    shiftTypeRepository
  });
  const offRequestService = createOffRequestService({
    offRequestRepository,
    rosterSnapshotRepository
  });
  const biasManagementService = createBiasManagementService({
    biasLedgerRepository,
    weekdayPairBiasLedgerRepository
  });
  const rosterWorkflowService = createRosterWorkflowService({
    doctorManagementService,
    leaveManagementService,
    shiftTypeManagementService,
    offRequestService,
    biasManagementService,
    biasLedgerRepository,
    weekdayPairBiasLedgerRepository,
    rosterSnapshotRepository,
    auditLogService
  });

  return {
    auditLogService,
    biasManagementService,
    doctorManagementService,
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
