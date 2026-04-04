import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DutyDesign, ShiftType } from "@/domain/models";
import type { RosterSnapshotRepository } from "@/domain/repositories";
import type { AuditLogService } from "@/features/audit/services/auditLogService";
import { createShiftTypeManagementService } from "@/features/shifts/services/shiftTypeManagementService";
import { AdminShiftTypePage } from "@/features/admin/pages/AdminShiftTypePage";
import {
  InMemoryBiasCriteriaRepository,
  InMemoryDutyDesignRepository,
  InMemoryShiftTypeRepository
} from "@/infrastructure/repositories/inMemory";

const mockUseAppServices = vi.fn();
const mockUseAuth = vi.fn();

vi.mock("@/app/providers/useAppServices", () => ({
  useAppServices: () => mockUseAppServices()
}));

vi.mock("@/features/auth/context/AuthContext", () => ({
  useAuth: () => mockUseAuth()
}));

const NOW = "2026-04-03T08:00:00.000Z";

function createShiftType(overrides: Partial<ShiftType> = {}): ShiftType {
  return {
    id: overrides.id ?? "shift-type-day",
    code: overrides.code ?? "DAY",
    label: overrides.label ?? "Day",
    startTime: overrides.startTime ?? "08:00",
    endTime: overrides.endTime ?? "20:00",
    category: overrides.category ?? "DAY",
    isActive: overrides.isActive ?? true,
    createdAt: overrides.createdAt ?? NOW,
    updatedAt: overrides.updatedAt ?? NOW
  };
}

function createDutyDesign(overrides: Partial<DutyDesign> = {}): DutyDesign {
  return {
    id: overrides.id ?? "design-day",
    code: overrides.code ?? "DESIGN_DAY",
    label: overrides.label ?? "Day Design",
    description: overrides.description,
    isActive: overrides.isActive ?? true,
    isHolidayDesign: overrides.isHolidayDesign ?? false,
    dutyBlocks: overrides.dutyBlocks ?? [
      {
        shiftTypeId: "shift-type-day",
        doctorCount: 1
      }
    ],
    createdAt: overrides.createdAt ?? NOW,
    updatedAt: overrides.updatedAt ?? NOW
  };
}

function createNoopAuditLogService(): AuditLogService {
  return {
    appendLog: async (entry) => ({
      id: crypto.randomUUID(),
      actorId: entry.actorId,
      actorRole: entry.actorRole,
      actionType: entry.actionType,
      entityType: entry.entityType,
      entityId: entry.entityId,
      details: entry.details,
      createdAt: NOW,
      correlationId: entry.correlationId
    }),
    listLogs: async () => []
  };
}

function createEmptyRosterSnapshotRepository(): RosterSnapshotRepository {
  return {
    list: async () => [],
    findById: async () => null,
    save: async (snapshot) => snapshot
  };
}

function renderPage(options?: { readonly dutyDesigns?: ReadonlyArray<DutyDesign> }) {
  const shiftTypeManagementService = createShiftTypeManagementService({
    shiftTypeRepository: new InMemoryShiftTypeRepository([createShiftType()]),
    dutyDesignRepository: new InMemoryDutyDesignRepository(options?.dutyDesigns ?? []),
    biasCriteriaRepository: new InMemoryBiasCriteriaRepository(),
    rosterSnapshotRepository: createEmptyRosterSnapshotRepository(),
    auditLogService: createNoopAuditLogService()
  });

  mockUseAppServices.mockReturnValue({
    shiftTypeManagementService
  });
  mockUseAuth.mockReturnValue({
    user: { id: "user-admin-demo" },
    role: "ADMIN"
  });

  return render(
    <MemoryRouter>
      <AdminShiftTypePage />
    </MemoryRouter>
  );
}

describe("AdminShiftTypePage", () => {
  beforeEach(() => {
    mockUseAppServices.mockReset();
    mockUseAuth.mockReset();
    vi.restoreAllMocks();
  });

  it("renders and creates a new shift type", async () => {
    const user = userEvent.setup();
    renderPage();

    await screen.findByText("Day");

    await user.click(screen.getByRole("button", { name: "Add Shift Type" }));
    await user.type(screen.getByLabelText("Code"), "custom_long");
    await user.type(screen.getByLabelText("Label"), "Custom Long");
    await user.clear(screen.getByLabelText("Start Time"));
    await user.type(screen.getByLabelText("Start Time"), "10:00");
    await user.clear(screen.getByLabelText("End Time"));
    await user.type(screen.getByLabelText("End Time"), "18:00");
    await user.click(screen.getByRole("button", { name: "CUSTOM" }));
    await user.click(screen.getByRole("button", { name: "Create Shift Type" }));

    expect(await screen.findByText("Created Custom Long.")).toBeInTheDocument();
    expect((await screen.findAllByText("Custom Long")).length).toBeGreaterThan(0);
  });

  it("shows a delete-blocked error when the shift type is still referenced", async () => {
    const user = userEvent.setup();
    vi.spyOn(window, "confirm").mockReturnValue(true);
    renderPage({
      dutyDesigns: [createDutyDesign()]
    });

    await user.click((await screen.findByText("Day")).closest("button")!);
    await user.click(await screen.findByRole("button", { name: "Delete" }));

    expect(
      await screen.findByText(/Cannot delete shift type 'Day'/)
    ).toBeInTheDocument();
  });
});
