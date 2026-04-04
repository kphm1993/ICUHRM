import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { BiasCriteria } from "@/domain/models";
import { createAuditLogService } from "@/features/audit/services/auditLogService";
import { createBiasManagementService } from "@/features/fairness/services/biasManagementService";
import { AdminRostersPage } from "@/features/admin/pages/AdminRostersPage";
import { createRosterWizardService } from "@/features/roster/services/rosterWizardService";
import {
  InMemoryBiasCriteriaRepository,
  InMemoryBiasLedgerRepository,
  InMemoryWeekdayPairBiasLedgerRepository
} from "@/infrastructure/repositories/inMemory";
import {
  LocalStorageAuditLogRepository,
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

function createWizardService(storageKeyPrefix: string) {
  const rosterWizardDraftRepository = new LocalStorageRosterWizardDraftRepository({
    storageKey: `${storageKeyPrefix}:wizard-drafts`,
    seedData: []
  });
  const auditLogService = createAuditLogService({
    auditLogRepository: new LocalStorageAuditLogRepository({
      storageKey: `${storageKeyPrefix}:audit-logs`,
      seedData: []
    })
  });
  const biasManagementService = createBiasManagementService({
    biasCriteriaRepository: new InMemoryBiasCriteriaRepository(createCriteria()),
    biasLedgerRepository: new InMemoryBiasLedgerRepository([
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
    ]),
    weekdayPairBiasLedgerRepository: new InMemoryWeekdayPairBiasLedgerRepository()
  });

  return createRosterWizardService({
    rosterWizardDraftRepository,
    biasManagementService,
    auditLogService
  });
}

function renderPage(storageKeyPrefix: string) {
  mockUseAppServices.mockReturnValue({
    rosterWizardService: createWizardService(storageKeyPrefix)
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
});
