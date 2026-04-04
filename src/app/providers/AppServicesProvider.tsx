import { createContext, useContext, useState } from "react";
import {
  ROSTER_SEED_AUDIT_LOGS,
  ROSTER_SEED_BIAS_CRITERIA,
  ROSTER_SEED_BIAS_LEDGERS,
  ROSTER_SEED_DOCTORS,
  ROSTER_SEED_DOCTOR_GROUPS,
  ROSTER_SEED_GROUP_CONSTRAINT_TEMPLATES,
  ROSTER_SEED_DUTY_DESIGNS,
  ROSTER_SEED_DUTY_DESIGN_ASSIGNMENTS,
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
import { createDoctorGroupManagementService } from "@/features/doctors/services/doctorGroupManagementService";
import { createDoctorManagementService } from "@/features/doctors/services/doctorManagementService";
import { createDutyDesignAssignmentService } from "@/features/dutyDesigns/services/dutyDesignAssignmentService";
import { createDutyDesignManagementService } from "@/features/dutyDesigns/services/dutyDesignManagementService";
import { createBiasManagementService } from "@/features/fairness/services/biasManagementService";
import { createLeaveManagementService } from "@/features/leaves/services/leaveManagementService";
import { createOffRequestService } from "@/features/offRequests/services/offRequestService";
import { createGroupConstraintTemplateManagementService } from "@/features/roster/services/groupConstraintTemplateManagementService";
import { createRosterWorkflowService } from "@/features/roster/services/rosterWorkflowService";
import { createRosterWizardService } from "@/features/roster/services/rosterWizardService";
import { createShiftTypeManagementService } from "@/features/shifts/services/shiftTypeManagementService";
import {
  InMemoryLeaveRepository
} from "@/infrastructure/repositories/inMemory";
import {
  LocalStorageAuditLogRepository,
  LocalStorageBiasCriteriaRepository,
  LocalStorageBiasLedgerRepository,
  LocalStorageDoctorRepository,
  LocalStorageDoctorGroupRepository,
  LocalStorageDutyDesignAssignmentRepository,
  LocalStorageDutyDesignRepository,
  LocalStorageDutyLocationRepository,
  LocalStorageGroupConstraintTemplateRepository,
  LocalStorageOffRequestRepository,
  LocalStorageRosterSnapshotRepository,
  LocalStorageRosterWizardDraftRepository,
  LocalStorageShiftTypeRepository,
  LocalStorageWeekdayPairBiasLedgerRepository
} from "@/infrastructure/repositories/browserStorage";

export interface AppServices {
  readonly auditLogService: ReturnType<typeof createAuditLogService>;
  readonly biasManagementService: ReturnType<typeof createBiasManagementService>;
  readonly biasCriteriaManagementService: ReturnType<
    typeof createBiasCriteriaManagementService
  >;
  readonly doctorManagementService: ReturnType<typeof createDoctorManagementService>;
  readonly doctorGroupManagementService: ReturnType<
    typeof createDoctorGroupManagementService
  >;
  readonly groupConstraintTemplateManagementService: ReturnType<
    typeof createGroupConstraintTemplateManagementService
  >;
  readonly dutyDesignAssignmentService: ReturnType<
    typeof createDutyDesignAssignmentService
  >;
  readonly dutyDesignManagementService: ReturnType<
    typeof createDutyDesignManagementService
  >;
  readonly dutyLocationManagementService: ReturnType<
    typeof createDutyLocationManagementService
  >;
  readonly leaveManagementService: ReturnType<typeof createLeaveManagementService>;
  readonly offRequestService: ReturnType<typeof createOffRequestService>;
  readonly rosterWorkflowService: ReturnType<typeof createRosterWorkflowService>;
  readonly rosterWizardService: ReturnType<typeof createRosterWizardService>;
  readonly shiftTypeManagementService: ReturnType<typeof createShiftTypeManagementService>;
}

function createAppRepositories() {
  return {
    doctorRepository: new LocalStorageDoctorRepository({
      seedData: ROSTER_SEED_DOCTORS
    }),
    doctorGroupRepository: new LocalStorageDoctorGroupRepository({
      seedData: ROSTER_SEED_DOCTOR_GROUPS
    }),
    groupConstraintTemplateRepository: new LocalStorageGroupConstraintTemplateRepository({
      seedData: ROSTER_SEED_GROUP_CONSTRAINT_TEMPLATES
    }),
    shiftTypeRepository: new LocalStorageShiftTypeRepository({
      seedData: ROSTER_SEED_SHIFT_TYPES
    }),
    dutyLocationRepository: new LocalStorageDutyLocationRepository({
      seedData: ROSTER_SEED_DUTY_LOCATIONS
    }),
    biasCriteriaRepository: new LocalStorageBiasCriteriaRepository({
      seedData: ROSTER_SEED_BIAS_CRITERIA
    }),
    dutyDesignRepository: new LocalStorageDutyDesignRepository({
      seedData: ROSTER_SEED_DUTY_DESIGNS
    }),
    dutyDesignAssignmentRepository: new LocalStorageDutyDesignAssignmentRepository({
      seedData: ROSTER_SEED_DUTY_DESIGN_ASSIGNMENTS
    }),
    rosterWizardDraftRepository: new LocalStorageRosterWizardDraftRepository(),
    leaveRepository: new InMemoryLeaveRepository(ROSTER_SEED_LEAVES),
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
    doctorGroupRepository: repositories.doctorGroupRepository,
    leaveRepository: repositories.leaveRepository,
    offRequestRepository: repositories.offRequestRepository,
    biasLedgerRepository: repositories.biasLedgerRepository,
    weekdayPairBiasLedgerRepository: repositories.weekdayPairBiasLedgerRepository,
    rosterSnapshotRepository: repositories.rosterSnapshotRepository,
    auditLogService
  });
  const groupConstraintTemplateManagementService =
    createGroupConstraintTemplateManagementService({
      groupConstraintTemplateRepository: repositories.groupConstraintTemplateRepository,
      doctorGroupRepository: repositories.doctorGroupRepository,
      auditLogService
    });
  const dutyDesignManagementService = createDutyDesignManagementService({
    dutyDesignRepository: repositories.dutyDesignRepository,
    dutyDesignAssignmentRepository: repositories.dutyDesignAssignmentRepository,
    shiftTypeRepository: repositories.shiftTypeRepository,
    dutyLocationRepository: repositories.dutyLocationRepository,
    rosterSnapshotRepository: repositories.rosterSnapshotRepository,
    auditLogService
  });
  const dutyDesignAssignmentService = createDutyDesignAssignmentService({
    dutyDesignAssignmentRepository: repositories.dutyDesignAssignmentRepository,
    dutyDesignRepository: repositories.dutyDesignRepository,
    auditLogService
  });
  const leaveManagementService = createLeaveManagementService({
    leaveRepository: repositories.leaveRepository
  });
  const doctorGroupManagementService = createDoctorGroupManagementService({
    doctorGroupRepository: repositories.doctorGroupRepository,
    auditLogService
  });
  const shiftTypeManagementService = createShiftTypeManagementService({
    shiftTypeRepository: repositories.shiftTypeRepository,
    dutyDesignRepository: repositories.dutyDesignRepository,
    biasCriteriaRepository: repositories.biasCriteriaRepository,
    rosterSnapshotRepository: repositories.rosterSnapshotRepository,
    auditLogService
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
    doctorGroupManagementService,
    doctorManagementService,
    dutyDesignManagementService,
    dutyDesignAssignmentService,
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
  const rosterWizardService = createRosterWizardService({
    rosterWizardDraftRepository: repositories.rosterWizardDraftRepository,
    doctorRepository: repositories.doctorRepository,
    groupConstraintTemplateRepository: repositories.groupConstraintTemplateRepository,
    dutyDesignRepository: repositories.dutyDesignRepository,
    biasCriteriaManagementService,
    dutyLocationManagementService,
    shiftTypeManagementService,
    leaveManagementService,
    offRequestService,
    biasManagementService,
    auditLogService
  });

  return {
    auditLogService,
    biasManagementService,
    biasCriteriaManagementService,
    doctorGroupManagementService,
    doctorManagementService,
    groupConstraintTemplateManagementService,
    dutyDesignAssignmentService,
    dutyDesignManagementService,
    dutyLocationManagementService,
    leaveManagementService,
    offRequestService,
    rosterWorkflowService,
    rosterWizardService,
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
