import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_DUTY_LOCATION_ID,
  type BiasCriteria,
  type BiasLedger,
  type Doctor,
  type DoctorGroup,
  type DutyDesign,
  type DutyLocation,
  type ShiftType
} from "@/domain/models";
import { createBiasCriteriaManagementService } from "@/features/admin/services/biasCriteriaManagementService";
import { createDutyLocationManagementService } from "@/features/admin/services/dutyLocationManagementService";
import { createAuditLogService } from "@/features/audit/services/auditLogService";
import { createBiasManagementService } from "@/features/fairness/services/biasManagementService";
import { AdminRostersPage } from "@/features/admin/pages/AdminRostersPage";
import { createLeaveManagementService } from "@/features/leaves/services/leaveManagementService";
import { createOffRequestService } from "@/features/offRequests/services/offRequestService";
import { createGroupConstraintTemplateManagementService } from "@/features/roster/services/groupConstraintTemplateManagementService";
import { createRosterWizardService } from "@/features/roster/services/rosterWizardService";
import { createShiftTypeManagementService } from "@/features/shifts/services/shiftTypeManagementService";
import {
  InMemoryBiasCriteriaRepository,
  InMemoryBiasLedgerRepository,
  InMemoryDoctorGroupRepository,
  InMemoryDoctorRepository,
  InMemoryDutyLocationRepository,
  InMemoryDutyDesignRepository,
  InMemoryLeaveRepository,
  InMemoryShiftTypeRepository,
  InMemoryWeekdayPairBiasLedgerRepository
} from "@/infrastructure/repositories/inMemory";
import {
  LocalStorageAuditLogRepository,
  LocalStorageGroupConstraintTemplateRepository,
  LocalStorageOffRequestRepository,
  LocalStorageRosterSnapshotRepository,
  LocalStorageRosterWizardDraftRepository,
  removeStorageCollection
} from "@/infrastructure/repositories/browserStorage";

const mockUseAppServices = vi.fn();
const mockUseAuth = vi.fn();

vi.mock("@/app/providers/useAppServices", () => ({
  useAppServices: () => mockUseAppServices()
}));

vi.mock("@/features/auth/context/AuthContext", () => ({
  useAuth: () => mockUseAuth()
}));

vi.mock("@/features/roster/components/AdminRosterWorkflowToolsSection", () => ({
  AdminRosterWorkflowToolsSection: () => (
    <div data-testid="existing-roster-workflow-tools">Existing workflow tools</div>
  )
}));

const NOW = "2026-04-14T09:00:00.000Z";

function createDoctorGroup(overrides: Partial<DoctorGroup> = {}): DoctorGroup {
  return {
    id: overrides.id ?? "group-a",
    name: overrides.name ?? "Group A",
    createdAt: overrides.createdAt ?? NOW,
    updatedAt: overrides.updatedAt ?? NOW
  };
}

function createDoctor(overrides: Partial<Doctor> = {}): Doctor {
  return {
    id: overrides.id ?? "doctor-a",
    userId: overrides.userId ?? "user-doctor-a",
    name: overrides.name ?? "Doctor A",
    phoneNumber: overrides.phoneNumber ?? "0700000001",
    uniqueIdentifier: overrides.uniqueIdentifier ?? "doctor.a",
    groupId: overrides.groupId ?? "group-a",
    weekendGroup: overrides.weekendGroup,
    isActive: overrides.isActive ?? true,
    createdAt: overrides.createdAt ?? NOW,
    updatedAt: overrides.updatedAt ?? NOW
  };
}

function createCriteria(): ReadonlyArray<BiasCriteria> {
  return [
    {
      id: "criteria-day-all",
      code: "DAY_ALL",
      label: "All Day Shifts",
      locationIds: [],
      shiftTypeIds: [],
      weekdayConditions: [],
      isWeekendOnly: false,
      isActive: true,
      isLocked: false,
      createdAt: NOW,
      updatedAt: NOW,
      createdByActorId: "user-admin-demo",
      updatedByActorId: "user-admin-demo"
    }
  ];
}

function createCriteriaEntry(overrides: Partial<BiasCriteria> = {}): BiasCriteria {
  return {
    id: overrides.id ?? "criteria-day-all",
    code: overrides.code ?? "DAY_ALL",
    label: overrides.label ?? "All Day Shifts",
    locationIds: overrides.locationIds ?? [],
    shiftTypeIds: overrides.shiftTypeIds ?? [],
    weekdayConditions: overrides.weekdayConditions ?? [],
    isWeekendOnly: overrides.isWeekendOnly ?? false,
    isActive: overrides.isActive ?? true,
    isLocked: overrides.isLocked ?? false,
    createdAt: overrides.createdAt ?? NOW,
    updatedAt: overrides.updatedAt ?? NOW,
    createdByActorId: overrides.createdByActorId ?? "user-admin-demo",
    updatedByActorId: overrides.updatedByActorId ?? "user-admin-demo"
  };
}

function createDutyDesign(overrides: Partial<DutyDesign> = {}): DutyDesign {
  return {
    id: overrides.id ?? "design-weekday",
    code: overrides.code ?? "WEEKDAY",
    label: overrides.label ?? "Weekday Design",
    description: overrides.description,
    isActive: overrides.isActive ?? true,
    isHolidayDesign: overrides.isHolidayDesign ?? false,
    dutyBlocks: overrides.dutyBlocks ?? [
      {
        shiftTypeId: "shift-type-day",
        locationId: DEFAULT_DUTY_LOCATION_ID,
        doctorCount: 1
      }
    ],
    createdAt: overrides.createdAt ?? NOW,
    updatedAt: overrides.updatedAt ?? NOW
  };
}

function createDutyLocation(overrides: Partial<DutyLocation> = {}): DutyLocation {
  return {
    id: overrides.id ?? DEFAULT_DUTY_LOCATION_ID,
    code: overrides.code ?? "CCU",
    label: overrides.label ?? "CCU",
    description: overrides.description,
    isActive: overrides.isActive ?? true,
    createdAt: overrides.createdAt ?? NOW,
    updatedAt: overrides.updatedAt ?? NOW
  };
}

function createShiftType(overrides: Partial<ShiftType> = {}): ShiftType {
  return {
    id: overrides.id ?? "shift-type-day",
    code: overrides.code ?? "DAY",
    label: overrides.label ?? "Day Shift",
    startTime: overrides.startTime ?? "08:00",
    endTime: overrides.endTime ?? "20:00",
    category: overrides.category ?? "DAY",
    isActive: overrides.isActive ?? true,
    createdAt: overrides.createdAt ?? NOW,
    updatedAt: overrides.updatedAt ?? NOW
  };
}

function createBiasLedger(overrides: Partial<BiasLedger> = {}): BiasLedger {
  return {
    id: overrides.id ?? "bias-1",
    doctorId: overrides.doctorId ?? "doctor-a",
    effectiveMonth: overrides.effectiveMonth ?? "2026-06",
    balances: overrides.balances ?? {
      "criteria-day-all": -1
    },
    source: overrides.source ?? "ROSTER_GENERATION",
    sourceReferenceId: overrides.sourceReferenceId ?? "roster-prev",
    updatedAt: overrides.updatedAt ?? NOW,
    updatedByActorId: overrides.updatedByActorId ?? "system"
  };
}

function createWizardService(
  storageKeyPrefix: string,
  options?: {
    readonly criteria?: ReadonlyArray<BiasCriteria>;
    readonly biasLedgers?: ReadonlyArray<BiasLedger>;
  }
) {
  const rosterWizardDraftRepository = new LocalStorageRosterWizardDraftRepository({
    storageKey: `${storageKeyPrefix}:wizard-drafts`,
    seedData: []
  });
  const rosterSnapshotRepository = new LocalStorageRosterSnapshotRepository({
    storageKey: `${storageKeyPrefix}:roster-snapshots`,
    seedData: []
  });
  const auditLogService = createAuditLogService({
    auditLogRepository: new LocalStorageAuditLogRepository({
      storageKey: `${storageKeyPrefix}:audit-logs`,
      seedData: []
    })
  });
  const biasCriteriaRepository = new InMemoryBiasCriteriaRepository(
    options?.criteria ?? createCriteria()
  );
  const biasLedgerRepository = new InMemoryBiasLedgerRepository(
    options?.biasLedgers ?? [
      {
        id: "bias-1",
        doctorId: "doctor-a",
        effectiveMonth: "2026-04",
        balances: {
          "criteria-day-all": -1
        },
        source: "ROSTER_GENERATION",
        sourceReferenceId: "roster-prev",
        updatedAt: NOW,
        updatedByActorId: "system"
      }
    ]
  );
  const doctorRepository = new InMemoryDoctorRepository([
    createDoctor(),
    createDoctor({
      id: "doctor-b",
      userId: "user-doctor-b",
      name: "Doctor B",
      phoneNumber: "0700000002",
      uniqueIdentifier: "doctor.b",
      groupId: "group-b"
    })
  ]);
  const dutyDesignRepository = new InMemoryDutyDesignRepository([
    createDutyDesign(),
    createDutyDesign({
      id: "design-holiday",
      code: "HOLIDAY",
      label: "Holiday Design",
      isHolidayDesign: true
    }),
    createDutyDesign({
      id: "design-inactive",
      code: "INACTIVE",
      label: "Inactive Design",
      isActive: false
    })
  ]);
  const biasManagementService = createBiasManagementService({
    biasCriteriaRepository,
    biasLedgerRepository,
    weekdayPairBiasLedgerRepository: new InMemoryWeekdayPairBiasLedgerRepository()
  });
  const biasCriteriaManagementService = createBiasCriteriaManagementService({
    biasCriteriaRepository,
    biasLedgerRepository,
    doctorRepository,
    rosterSnapshotRepository,
    auditLogService
  });
  const dutyLocationManagementService = createDutyLocationManagementService({
    dutyLocationRepository: new InMemoryDutyLocationRepository([createDutyLocation()]),
    biasCriteriaRepository,
    rosterSnapshotRepository,
    auditLogService
  });
  const shiftTypeManagementService = createShiftTypeManagementService({
    shiftTypeRepository: new InMemoryShiftTypeRepository([
      createShiftType(),
      createShiftType({
        id: "shift-type-night",
        code: "NIGHT",
        label: "Night Shift",
        startTime: "20:00",
        endTime: "08:00",
        category: "NIGHT"
      })
    ]),
    dutyDesignRepository,
    biasCriteriaRepository,
    rosterSnapshotRepository,
    auditLogService
  });
  const leaveManagementService = createLeaveManagementService({
    leaveRepository: new InMemoryLeaveRepository([])
  });
  const offRequestService = createOffRequestService({
    offRequestRepository: new LocalStorageOffRequestRepository({
      storageKey: `${storageKeyPrefix}:off-requests`,
      seedData: []
    }),
    rosterSnapshotRepository
  });

  return createRosterWizardService({
    rosterWizardDraftRepository,
    doctorRepository,
    groupConstraintTemplateRepository: new LocalStorageGroupConstraintTemplateRepository({
      storageKey: `${storageKeyPrefix}:group-constraint-templates`,
      seedData: []
    }),
    dutyDesignRepository,
    biasCriteriaManagementService,
    dutyLocationManagementService,
    shiftTypeManagementService,
    leaveManagementService,
    offRequestService,
    biasManagementService,
    auditLogService
  });
}

function renderPage(
  storageKeyPrefix: string,
  options?: {
    readonly criteria?: ReadonlyArray<BiasCriteria>;
    readonly biasLedgers?: ReadonlyArray<BiasLedger>;
  }
) {
  const doctorGroups = [
    createDoctorGroup(),
    createDoctorGroup({
      id: "group-b",
      name: "Group B"
    })
  ];
  const doctors = [
    createDoctor(),
    createDoctor({
      id: "doctor-b",
      userId: "user-doctor-b",
      name: "Doctor B",
      phoneNumber: "0700000002",
      uniqueIdentifier: "doctor.b",
      groupId: "group-b"
    })
  ];
  const dutyDesigns = [
    createDutyDesign(),
    createDutyDesign({
      id: "design-holiday",
      code: "HOLIDAY",
      label: "Holiday Design",
      isHolidayDesign: true
    }),
    createDutyDesign({
      id: "design-inactive",
      code: "INACTIVE",
      label: "Inactive Design",
      isActive: false
    })
  ];
  const auditLogService = createAuditLogService({
    auditLogRepository: new LocalStorageAuditLogRepository({
      storageKey: `${storageKeyPrefix}:template-audit-logs`,
      seedData: []
    })
  });

  mockUseAppServices.mockReturnValue({
    rosterWizardService: createWizardService(storageKeyPrefix, options),
    doctorGroupManagementService: {
      listDoctorGroups: vi.fn(async () => doctorGroups)
    },
    doctorManagementService: {
      listDoctors: vi.fn(async () => doctors)
    },
    dutyDesignManagementService: {
      listDutyDesigns: vi.fn(async () => dutyDesigns)
    },
    groupConstraintTemplateManagementService: createGroupConstraintTemplateManagementService({
      groupConstraintTemplateRepository: new LocalStorageGroupConstraintTemplateRepository({
        storageKey: `${storageKeyPrefix}:group-constraint-templates`,
        seedData: []
      }),
      doctorGroupRepository: new InMemoryDoctorGroupRepository(doctorGroups),
      auditLogService
    })
  });
  mockUseAuth.mockReturnValue({
    user: { id: "user-admin-demo" },
    role: "ADMIN"
  });

  return render(
    <MemoryRouter>
      <AdminRostersPage />
    </MemoryRouter>
  );
}

function getEnabledHolidayButton(date: string): HTMLButtonElement {
  const button = screen
    .getAllByRole("button", { name: `Toggle public holiday ${date}` })
    .find((entry) => !entry.hasAttribute("disabled"));

  if (!button) {
    throw new Error(`Enabled holiday button for ${date} was not found.`);
  }

  return button as HTMLButtonElement;
}

function getEnabledGroupConstraintButton(date: string): HTMLButtonElement {
  const button = screen
    .getAllByRole("button", { name: `Toggle group constraint date ${date}` })
    .find((entry) => !entry.hasAttribute("disabled"));

  if (!button) {
    throw new Error(`Enabled group constraint button for ${date} was not found.`);
  }

  return button as HTMLButtonElement;
}

function getEnabledDutyDesignButton(date: string): HTMLButtonElement {
  const button = screen
    .getAllByRole("button", { name: `Toggle duty design date ${date}` })
    .find((entry) => !entry.hasAttribute("disabled"));

  if (!button) {
    throw new Error(`Enabled duty design button for ${date} was not found.`);
  }

  return button as HTMLButtonElement;
}

describe("AdminRostersPage", () => {
  beforeEach(() => {
    mockUseAppServices.mockReset();
    mockUseAuth.mockReset();
  });

  afterEach(() => {
    window.localStorage.clear();
  });

  it("creates, autosaves, and resumes a wizard draft while keeping the existing workflow tools visible", async () => {
    const storageKeyPrefix = `icu-hrm:test:admin-rosters:${crypto.randomUUID()}`;
    const user = userEvent.setup();
    const view = renderPage(storageKeyPrefix);

    expect(screen.getByTestId("existing-roster-workflow-tools")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Default roster month"), {
      target: { value: "2026-04" }
    });

    await user.click(screen.getByRole("button", { name: "Generate Roster" }));

    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Roster Wizard 2026-04")).toBeInTheDocument();

    await user.clear(screen.getByLabelText("Draft name"));
    await user.type(screen.getByLabelText("Draft name"), "April Wizard");
    await user.click(screen.getByRole("button", { name: "Next" }));

    expect(await screen.findByText("Step 2")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Close" }));

    view.unmount();
    renderPage(storageKeyPrefix);

    expect(await screen.findByText("April Wizard")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Resume" }));

    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(screen.getByDisplayValue("April Wizard")).toBeInTheDocument();
    expect(screen.getByText("Step 2")).toBeInTheDocument();

    removeStorageCollection(`${storageKeyPrefix}:wizard-drafts`);
    removeStorageCollection(`${storageKeyPrefix}:audit-logs`);
  });

  it("supports Step 1 custom ranges, holiday selection, pruning, and resume", async () => {
    const storageKeyPrefix = `icu-hrm:test:admin-rosters:${crypto.randomUUID()}`;
    const user = userEvent.setup();
    const view = renderPage(storageKeyPrefix);

    fireEvent.change(screen.getByLabelText("Default roster month"), {
      target: { value: "2026-06" }
    });

    await user.click(screen.getByRole("button", { name: "Generate Roster" }));

    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(screen.getByLabelText("Anchor roster month")).toHaveValue("2026-06");
    expect(screen.getByLabelText("Custom start date")).toBeDisabled();

    await user.click(screen.getByLabelText("Custom range"));
    expect(screen.getByLabelText("Custom start date")).toHaveValue("2026-06-01");
    expect(screen.getByLabelText("Custom end date")).toHaveValue("2026-06-30");

    fireEvent.change(screen.getByLabelText("Custom end date"), {
      target: { value: "2026-07-04" }
    });

    expect(await screen.findByText("July 2026")).toBeInTheDocument();

    await user.click(getEnabledHolidayButton("2026-06-30"));
    await user.click(getEnabledHolidayButton("2026-07-01"));

    expect(getEnabledHolidayButton("2026-07-01")).toHaveAttribute(
      "aria-pressed",
      "true"
    );

    fireEvent.change(screen.getByLabelText("Custom end date"), {
      target: { value: "2026-06-30" }
    });

    expect(screen.queryByText("July 2026")).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Custom end date"), {
      target: { value: "2026-07-04" }
    });
    await user.click(getEnabledHolidayButton("2026-07-01"));

    await user.click(screen.getByRole("button", { name: "Next" }));

    expect(await screen.findByText("Step 2")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Back" }));

    expect(await screen.findByLabelText("Anchor roster month")).toHaveValue("2026-06");
    expect(screen.getByLabelText("Custom end date")).toHaveValue("2026-07-04");
    expect(getEnabledHolidayButton("2026-06-30")).toHaveAttribute(
      "aria-pressed",
      "true"
    );
    expect(getEnabledHolidayButton("2026-07-01")).toHaveAttribute(
      "aria-pressed",
      "true"
    );

    await user.click(screen.getByRole("button", { name: "Close" }));

    view.unmount();
    renderPage(storageKeyPrefix);

    await user.click(await screen.findByRole("button", { name: "Resume" }));

    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(screen.getByLabelText("Custom end date")).toHaveValue("2026-07-04");
    expect(getEnabledHolidayButton("2026-06-30")).toHaveAttribute(
      "aria-pressed",
      "true"
    );
    expect(getEnabledHolidayButton("2026-07-01")).toHaveAttribute(
      "aria-pressed",
      "true"
    );

    removeStorageCollection(`${storageKeyPrefix}:wizard-drafts`);
    removeStorageCollection(`${storageKeyPrefix}:audit-logs`);
    removeStorageCollection(`${storageKeyPrefix}:group-constraint-templates`);
    removeStorageCollection(`${storageKeyPrefix}:template-audit-logs`);
  });

  it("supports Step 2 template creation, assignment, exclusions, autosave, and resume", async () => {
    const storageKeyPrefix = `icu-hrm:test:admin-rosters:${crypto.randomUUID()}`;
    const user = userEvent.setup();
    const view = renderPage(storageKeyPrefix);

    fireEvent.change(screen.getByLabelText("Default roster month"), {
      target: { value: "2026-06" }
    });

    await user.click(screen.getByRole("button", { name: "Generate Roster" }));
    await user.click(await screen.findByRole("button", { name: "Next" }));

    expect(await screen.findByText("Group Constraints & Exclusions")).toBeInTheDocument();

    await user.type(screen.getByLabelText("Code"), "group a");
    await user.type(screen.getByLabelText("Label"), "Group A Days");
    fireEvent.change(screen.getByLabelText("Allowed group"), {
      target: { value: "group-a" }
    });
    await user.click(screen.getByRole("button", { name: "Create Template" }));

    expect(
      await screen.findAllByText("Created group constraint template 'GROUP_A'.")
    ).not.toHaveLength(0);
    expect(screen.getByLabelText("Template")).not.toHaveValue("");

    await user.click(getEnabledGroupConstraintButton("2026-06-12"));
    await user.click(
      screen.getByRole("button", { name: "Apply To 1 Selected Date" })
    );

    expect(await screen.findByText("Fri, Jun 12")).toBeInTheDocument();
    expect(screen.getByText("GROUP_A | Group A Days")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Doctor"), {
      target: { value: "doctor-a" }
    });
    fireEvent.change(screen.getByLabelText("Start date"), {
      target: { value: "2026-06-14" }
    });
    fireEvent.change(screen.getByLabelText("End date"), {
      target: { value: "2026-06-16" }
    });
    await user.type(screen.getByLabelText("Reason (optional)"), "Course");
    await user.click(screen.getByRole("button", { name: "Add Exclusion" }));

    expect(await screen.findByText("Course")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Next" }));
    expect(await screen.findByText("Step 3")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Back" }));

    expect(await screen.findByText("Group Constraints & Exclusions")).toBeInTheDocument();
    expect(screen.getByText("GROUP_A | Group A Days")).toBeInTheDocument();
    expect(screen.getByText("Course")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Close" }));

    view.unmount();
    renderPage(storageKeyPrefix);

    await user.click(await screen.findByRole("button", { name: "Resume" }));
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Group Constraints & Exclusions")).toBeInTheDocument();
    expect(await screen.findByText("GROUP_A | Group A Days")).toBeInTheDocument();
    expect(screen.getByText("Course")).toBeInTheDocument();

    removeStorageCollection(`${storageKeyPrefix}:wizard-drafts`);
    removeStorageCollection(`${storageKeyPrefix}:audit-logs`);
    removeStorageCollection(`${storageKeyPrefix}:group-constraint-templates`);
    removeStorageCollection(`${storageKeyPrefix}:template-audit-logs`);
  });

  it("supports Step 3 duty design mapping, strict holiday overrides, pruning, and resume", async () => {
    const storageKeyPrefix = `icu-hrm:test:admin-rosters:${crypto.randomUUID()}`;
    const user = userEvent.setup();
    const view = renderPage(storageKeyPrefix);

    fireEvent.change(screen.getByLabelText("Default roster month"), {
      target: { value: "2026-06" }
    });

    await user.click(screen.getByRole("button", { name: "Generate Roster" }));
    await user.click(await screen.findByLabelText("Custom range"));
    fireEvent.change(screen.getByLabelText("Custom end date"), {
      target: { value: "2026-07-04" }
    });
    await user.click(getEnabledHolidayButton("2026-07-01"));
    await user.click(screen.getByRole("button", { name: "Next" }));
    await screen.findByText("Group Constraints & Exclusions");
    await user.click(screen.getByRole("button", { name: "Next" }));

    expect(await screen.findByText("Duty Design Mapping")).toBeInTheDocument();

    await user.click(getEnabledDutyDesignButton("2026-06-12"));
    await user.click(getEnabledDutyDesignButton("2026-07-01"));
    await user.selectOptions(
      screen.getByLabelText("Duty design"),
      "design-weekday"
    );
    await user.click(screen.getByRole("button", { name: "Apply To 2 Selected Dates" }));

    expect(await screen.findAllByText("Weekday Design")).not.toHaveLength(0);
    expect(screen.getByText("Mapped Dates")).toBeInTheDocument();

    await user.click(getEnabledDutyDesignButton("2026-06-12"));
    await user.click(screen.getByRole("radio", { name: /Holiday override/i }));
    await user.selectOptions(
      screen.getByLabelText("Duty design"),
      "design-holiday"
    );
    await user.click(screen.getByRole("button", { name: "Apply To 1 Selected Date" }));

    expect(
      (
        await screen.findAllByText(
          "Holiday override duty designs can only be applied to Step 1 holidays. 2026-06-12 is not marked as a holiday."
        )
      ).length
    ).toBeGreaterThan(0);

    await user.click(getEnabledDutyDesignButton("2026-06-12"));
    await user.click(getEnabledDutyDesignButton("2026-07-01"));
    await user.click(screen.getByRole("button", { name: "Apply To 1 Selected Date" }));

    expect(await screen.findAllByText("Holiday Design")).not.toHaveLength(0);

    await user.click(screen.getByRole("button", { name: "Back" }));
    expect(await screen.findByText("Group Constraints & Exclusions")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Back" }));
    expect(
      await screen.findByRole("heading", { name: "Period & Holidays" })
    ).toBeInTheDocument();

    await user.click(getEnabledHolidayButton("2026-07-01"));
    await user.click(screen.getByRole("button", { name: "Next" }));
    await screen.findByText("Group Constraints & Exclusions");
    await user.click(screen.getByRole("button", { name: "Next" }));

    expect(await screen.findByText("Duty Design Mapping")).toBeInTheDocument();
    expect(screen.queryByText("Holiday Design")).not.toBeInTheDocument();
    expect(await screen.findAllByText("Weekday Design")).not.toHaveLength(0);

    await user.click(screen.getByRole("button", { name: "Close" }));

    view.unmount();
    renderPage(storageKeyPrefix);

    await user.click(await screen.findByRole("button", { name: "Resume" }));
    expect(await screen.findByText("Duty Design Mapping")).toBeInTheDocument();
    expect(await screen.findAllByText("Weekday Design")).not.toHaveLength(0);
    expect(screen.queryByText("Holiday Design")).not.toBeInTheDocument();

    removeStorageCollection(`${storageKeyPrefix}:wizard-drafts`);
    removeStorageCollection(`${storageKeyPrefix}:audit-logs`);
    removeStorageCollection(`${storageKeyPrefix}:group-constraint-templates`);
    removeStorageCollection(`${storageKeyPrefix}:template-audit-logs`);
  });

  it("prunes Step 2 mappings and exclusions when the Step 1 range shrinks", async () => {
    const storageKeyPrefix = `icu-hrm:test:admin-rosters:${crypto.randomUUID()}`;
    const user = userEvent.setup();
    renderPage(storageKeyPrefix);

    fireEvent.change(screen.getByLabelText("Default roster month"), {
      target: { value: "2026-06" }
    });

    await user.click(screen.getByRole("button", { name: "Generate Roster" }));
    await user.click(await screen.findByLabelText("Custom range"));
    fireEvent.change(screen.getByLabelText("Custom end date"), {
      target: { value: "2026-07-04" }
    });
    await user.click(screen.getByRole("button", { name: "Next" }));

    await user.type(screen.getByLabelText("Code"), "group b");
    await user.type(screen.getByLabelText("Label"), "Group B Days");
    fireEvent.change(screen.getByLabelText("Allowed group"), {
      target: { value: "group-b" }
    });
    await user.click(screen.getByRole("button", { name: "Create Template" }));

    await user.click(getEnabledGroupConstraintButton("2026-07-03"));
    await user.click(screen.getByRole("button", { name: "Apply To 1 Selected Date" }));

    fireEvent.change(screen.getByLabelText("Doctor"), {
      target: { value: "doctor-b" }
    });
    fireEvent.change(screen.getByLabelText("Start date"), {
      target: { value: "2026-07-02" }
    });
    fireEvent.change(screen.getByLabelText("End date"), {
      target: { value: "2026-07-04" }
    });
    await user.click(screen.getByRole("button", { name: "Add Exclusion" }));

    await user.click(screen.getByRole("button", { name: "Back" }));
    fireEvent.change(screen.getByLabelText("Custom end date"), {
      target: { value: "2026-06-30" }
    });
    await user.click(screen.getByRole("button", { name: "Next" }));

    expect(await screen.findByText("Group Constraints & Exclusions")).toBeInTheDocument();
    expect(screen.getByText("No date constraints assigned yet.")).toBeInTheDocument();
    expect(screen.getByText("No doctor exclusions added yet.")).toBeInTheDocument();

    removeStorageCollection(`${storageKeyPrefix}:wizard-drafts`);
    removeStorageCollection(`${storageKeyPrefix}:audit-logs`);
    removeStorageCollection(`${storageKeyPrefix}:group-constraint-templates`);
    removeStorageCollection(`${storageKeyPrefix}:template-audit-logs`);
  });

  it("supports Step 4 modal assignment with disabled ineligible doctors and live daily-list updates", async () => {
    const storageKeyPrefix = `icu-hrm:test:admin-rosters:${crypto.randomUUID()}`;
    const user = userEvent.setup();
    renderPage(storageKeyPrefix);

    fireEvent.change(screen.getByLabelText("Default roster month"), {
      target: { value: "2026-06" }
    });

    await user.click(screen.getByRole("button", { name: "Generate Roster" }));
    await user.click(await screen.findByLabelText("Custom range"));
    fireEvent.change(screen.getByLabelText("Custom start date"), {
      target: { value: "2026-06-12" }
    });
    fireEvent.change(screen.getByLabelText("Custom end date"), {
      target: { value: "2026-06-12" }
    });

    await user.click(screen.getByRole("button", { name: "Next" }));
    expect(await screen.findByText("Group Constraints & Exclusions")).toBeInTheDocument();

    await user.type(screen.getByLabelText("Code"), "group a only");
    await user.type(screen.getByLabelText("Label"), "Group A Only");
    fireEvent.change(screen.getByLabelText("Allowed group"), {
      target: { value: "group-a" }
    });
    await user.click(screen.getByRole("button", { name: "Create Template" }));
    await user.click(getEnabledGroupConstraintButton("2026-06-12"));
    await user.click(screen.getByRole("button", { name: "Apply To 1 Selected Date" }));

    await user.click(screen.getByRole("button", { name: "Next" }));
    expect(await screen.findByText("Duty Design Mapping")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Next" }));

    expect(await screen.findByText("Manual Shift Allocation")).toBeInTheDocument();

    const shiftButton = screen
      .getAllByRole("button", { name: /Day Shift/i })
      .find((button) => button.textContent?.includes("Unassigned"));

    if (!shiftButton) {
      throw new Error("Expected an unassigned Step 4 day shift button.");
    }

    await user.click(shiftButton);

    const dialogs = await screen.findAllByRole("dialog");
    const modal = dialogs[dialogs.length - 1] ?? null;

    if (!modal) {
      throw new Error("Expected the Step 4 shift allocation modal to open.");
    }

    expect(within(modal).getByRole("button", { name: /Doctor B/i })).toBeDisabled();
    await user.click(within(modal).getByRole("button", { name: /Doctor A/i }));
    await user.click(within(modal).getByRole("button", { name: "Assign Doctor" }));

    expect((await screen.findAllByText("Shift assignment updated.")).length).toBeGreaterThan(
      0
    );
    await user.click(within(modal).getByRole("button", { name: "Close" }));

    expect(screen.getAllByText("Doctor A").length).toBeGreaterThan(0);

    removeStorageCollection(`${storageKeyPrefix}:wizard-drafts`);
    removeStorageCollection(`${storageKeyPrefix}:audit-logs`);
    removeStorageCollection(`${storageKeyPrefix}:group-constraint-templates`);
    removeStorageCollection(`${storageKeyPrefix}:template-audit-logs`);
    removeStorageCollection(`${storageKeyPrefix}:off-requests`);
    removeStorageCollection(`${storageKeyPrefix}:roster-snapshots`);
  });

  it("renders Step 4 bias tabs from live matching criteria in specificity order", async () => {
    const storageKeyPrefix = `icu-hrm:test:admin-rosters:${crypto.randomUUID()}`;
    const user = userEvent.setup();
    renderPage(storageKeyPrefix, {
      criteria: [
        createCriteriaEntry({
          id: "criteria-any-shift",
          code: "ANY_SHIFT",
          label: "Any Shift"
        }),
        createCriteriaEntry({
          id: "criteria-any-night",
          code: "ANY_NIGHT",
          label: "Any Day Night",
          shiftTypeIds: ["shift-type-night"]
        }),
        createCriteriaEntry({
          id: "criteria-monday-any",
          code: "MONDAY_ANY",
          label: "Monday Any Shift",
          weekdayConditions: ["MON"]
        }),
        createCriteriaEntry({
          id: "criteria-monday-night",
          code: "MONDAY_NIGHT",
          label: "Monday Night",
          weekdayConditions: ["MON"],
          shiftTypeIds: ["shift-type-night"]
        })
      ],
      biasLedgers: [
        createBiasLedger({
          id: "bias-a",
          doctorId: "doctor-a",
          effectiveMonth: "2026-06",
          balances: {
            "criteria-any-shift": 1,
            "criteria-any-night": 0,
            "criteria-monday-any": -1,
            "criteria-monday-night": 2
          }
        }),
        createBiasLedger({
          id: "bias-b",
          doctorId: "doctor-b",
          effectiveMonth: "2026-06",
          balances: {
            "criteria-any-shift": -1,
            "criteria-any-night": -2,
            "criteria-monday-any": 4,
            "criteria-monday-night": -3
          }
        })
      ]
    });

    fireEvent.change(screen.getByLabelText("Default roster month"), {
      target: { value: "2026-06" }
    });

    await user.click(screen.getByRole("button", { name: "Generate Roster" }));
    await user.click(await screen.findByLabelText("Custom range"));
    fireEvent.change(screen.getByLabelText("Custom start date"), {
      target: { value: "2026-06-15" }
    });
    fireEvent.change(screen.getByLabelText("Custom end date"), {
      target: { value: "2026-06-15" }
    });

    await user.click(screen.getByRole("button", { name: "Next" }));
    await screen.findByText("Group Constraints & Exclusions");
    await user.click(screen.getByRole("button", { name: "Next" }));
    await screen.findByText("Duty Design Mapping");
    await user.click(screen.getByRole("button", { name: "Next" }));

    expect(await screen.findByText("Manual Shift Allocation")).toBeInTheDocument();

    const nightShiftButton = screen
      .getAllByRole("button")
      .find(
        (button) =>
          button.textContent?.includes("Night Shift") &&
          button.textContent?.includes("Unassigned")
      );

    if (!nightShiftButton) {
      throw new Error("Expected an unassigned Monday night shift button.");
    }

    await user.click(nightShiftButton);

    const dialogs = await screen.findAllByRole("dialog");
    const modal = dialogs[dialogs.length - 1] ?? null;

    if (!modal) {
      throw new Error("Expected the Step 4 shift allocation modal to open.");
    }

    expect(within(modal).getByLabelText("Bias criteria tabs")).toBeInTheDocument();

    const tabs = within(modal).getAllByRole("tab");

    expect(tabs).toHaveLength(4);
    expect(tabs[0]).toHaveTextContent("Monday Night");
    expect(tabs[1]).toHaveTextContent("Monday Any Shift");
    expect(tabs[2]).toHaveTextContent("Any Day Night");
    expect(tabs[3]).toHaveTextContent("Any Shift");
    expect(
      within(modal).queryByRole("tab", { name: /Overall ranking/i })
    ).not.toBeInTheDocument();

    removeStorageCollection(`${storageKeyPrefix}:wizard-drafts`);
    removeStorageCollection(`${storageKeyPrefix}:audit-logs`);
    removeStorageCollection(`${storageKeyPrefix}:group-constraint-templates`);
    removeStorageCollection(`${storageKeyPrefix}:template-audit-logs`);
    removeStorageCollection(`${storageKeyPrefix}:off-requests`);
    removeStorageCollection(`${storageKeyPrefix}:roster-snapshots`);
  });

  it("shows Step 5 review data, blocks publish on incomplete drafts, and jumps back to earlier steps", async () => {
    const storageKeyPrefix = `icu-hrm:test:admin-rosters:${crypto.randomUUID()}`;
    const user = userEvent.setup();
    renderPage(storageKeyPrefix);

    fireEvent.change(screen.getByLabelText("Default roster month"), {
      target: { value: "2026-06" }
    });

    await user.click(screen.getByRole("button", { name: "Generate Roster" }));
    await user.click(await screen.findByLabelText("Custom range"));
    fireEvent.change(screen.getByLabelText("Custom start date"), {
      target: { value: "2026-06-12" }
    });
    fireEvent.change(screen.getByLabelText("Custom end date"), {
      target: { value: "2026-06-12" }
    });

    await user.click(screen.getByRole("button", { name: "Next" }));
    await screen.findByText("Group Constraints & Exclusions");
    await user.click(screen.getByRole("button", { name: "Next" }));
    await screen.findByText("Duty Design Mapping");
    await user.click(screen.getByRole("button", { name: "Next" }));

    expect(await screen.findByText("Manual Shift Allocation")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Publish.*Lock Draft|Republish.*Lock Draft/ })
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Next" }));

    expect(
      await screen.findByRole("heading", { name: "Review & Publish" })
    ).toBeInTheDocument();
    expect(await screen.findByText("Doctor Workload")).toBeInTheDocument();
    expect(screen.getByText("2 shift slots remain unassigned.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Publish & Lock Draft" })).toBeDisabled();

    await user.click(screen.getByRole("button", { name: "Edit Step 4" }));
    expect(await screen.findByText("Manual Shift Allocation")).toBeInTheDocument();

    removeStorageCollection(`${storageKeyPrefix}:wizard-drafts`);
    removeStorageCollection(`${storageKeyPrefix}:audit-logs`);
    removeStorageCollection(`${storageKeyPrefix}:group-constraint-templates`);
    removeStorageCollection(`${storageKeyPrefix}:template-audit-logs`);
    removeStorageCollection(`${storageKeyPrefix}:off-requests`);
    removeStorageCollection(`${storageKeyPrefix}:roster-snapshots`);
  });

  it("publishes into locked status, resumes locked drafts read-only, and unlocks for editing", async () => {
    const storageKeyPrefix = `icu-hrm:test:admin-rosters:${crypto.randomUUID()}`;
    const user = userEvent.setup();
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    renderPage(storageKeyPrefix);

    try {
      fireEvent.change(screen.getByLabelText("Default roster month"), {
        target: { value: "2026-06" }
      });

      await user.click(screen.getByRole("button", { name: "Generate Roster" }));
      await user.click(await screen.findByLabelText("Custom range"));
      fireEvent.change(screen.getByLabelText("Custom start date"), {
        target: { value: "2026-06-12" }
      });
      fireEvent.change(screen.getByLabelText("Custom end date"), {
        target: { value: "2026-06-12" }
      });

      await user.click(screen.getByRole("button", { name: "Next" }));
      await screen.findByText("Group Constraints & Exclusions");
      await user.click(screen.getByRole("button", { name: "Next" }));
      await screen.findByText("Duty Design Mapping");
      await user.click(screen.getByRole("button", { name: "Next" }));

      expect(await screen.findByText("Manual Shift Allocation")).toBeInTheDocument();

      const initialShiftButtons = screen
        .getAllByRole("button")
        .filter(
          (button) =>
            button.textContent?.includes("Unassigned") &&
            button.textContent?.includes("Shift")
        );

      if (initialShiftButtons.length < 2) {
        throw new Error("Expected two unassigned Step 4 shifts for publish testing.");
      }

      await user.click(initialShiftButtons[0]!);
      let dialogs = await screen.findAllByRole("dialog");
      let modal = dialogs[dialogs.length - 1];
      await user.click(within(modal).getByRole("button", { name: /Doctor A/i }));
      await user.click(within(modal).getByRole("button", { name: "Assign Doctor" }));
      expect((await screen.findAllByText("Shift assignment updated.")).length).toBeGreaterThan(
        0
      );
      await user.click(within(modal).getByRole("button", { name: "Close" }));

      const updatedShiftButtons = screen
        .getAllByRole("button")
        .filter(
          (button) =>
            button.textContent?.includes("Unassigned") &&
            button.textContent?.includes("Shift")
        );

      if (updatedShiftButtons.length < 1) {
        throw new Error("Expected one remaining unassigned Step 4 shift.");
      }

      await user.click(updatedShiftButtons[0]!);
      dialogs = await screen.findAllByRole("dialog");
      modal = dialogs[dialogs.length - 1];
      await user.click(within(modal).getByRole("button", { name: /Doctor B/i }));
      await user.click(within(modal).getByRole("button", { name: "Assign Doctor" }));
      expect((await screen.findAllByText("Shift assignment updated.")).length).toBeGreaterThan(
        0
      );
      await user.click(within(modal).getByRole("button", { name: "Close" }));

      await user.click(screen.getByRole("button", { name: "Next" }));

      expect(
        await screen.findByRole("heading", { name: "Review & Publish" })
      ).toBeInTheDocument();
      const publishButton = await screen.findByRole("button", {
        name: "Publish & Lock Draft"
      });
      expect(publishButton).toBeEnabled();

      await user.click(publishButton);

      expect(confirmSpy).toHaveBeenCalled();
      expect(
        (await screen.findAllByText("Wizard draft published and locked.")).length
      ).toBeGreaterThan(0);
      expect(screen.getAllByText("LOCKED").length).toBeGreaterThan(0);
      expect(
        screen.queryByRole("button", { name: /Publish.*Lock Draft|Republish.*Lock Draft/ })
      ).not.toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Unlock Draft" })).toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: "Close" }));
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

      await user.click(await screen.findByRole("button", { name: "Resume" }));
      expect(await screen.findByRole("heading", { name: "Review & Publish" })).toBeInTheDocument();
      expect(screen.getByDisplayValue("Roster Wizard 2026-06")).toBeDisabled();
      expect(screen.getByRole("button", { name: "Unlock Draft" })).toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: "Unlock Draft" }));
      expect((await screen.findAllByText("Wizard draft unlocked.")).length).toBeGreaterThan(0);
      expect(screen.getAllByText("PUBLISHED").length).toBeGreaterThan(0);
      expect(screen.getByDisplayValue("Roster Wizard 2026-06")).toBeEnabled();
      expect(screen.getByRole("button", { name: "Republish & Lock Draft" })).toBeInTheDocument();
    } finally {
      confirmSpy.mockRestore();
      removeStorageCollection(`${storageKeyPrefix}:wizard-drafts`);
      removeStorageCollection(`${storageKeyPrefix}:audit-logs`);
      removeStorageCollection(`${storageKeyPrefix}:group-constraint-templates`);
      removeStorageCollection(`${storageKeyPrefix}:template-audit-logs`);
      removeStorageCollection(`${storageKeyPrefix}:off-requests`);
      removeStorageCollection(`${storageKeyPrefix}:roster-snapshots`);
    }
  });
});
