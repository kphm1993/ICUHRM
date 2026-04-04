import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DutyDesign, DutyLocation, ShiftType } from "@/domain/models";
import type { AuditLogService } from "@/features/audit/services/auditLogService";
import { createDutyLocationManagementService } from "@/features/admin/services/dutyLocationManagementService";
import { AdminDutyDesignPage } from "@/features/admin/pages/AdminDutyDesignPage";
import { createDutyDesignManagementService } from "@/features/dutyDesigns/services/dutyDesignManagementService";
import { createShiftTypeManagementService } from "@/features/shifts/services/shiftTypeManagementService";
import {
  InMemoryBiasCriteriaRepository,
  InMemoryDutyDesignAssignmentRepository,
  InMemoryDutyDesignRepository,
  InMemoryDutyLocationRepository,
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

function createLocation(overrides: Partial<DutyLocation> = {}): DutyLocation {
  return {
    id: overrides.id ?? "location-ccu",
    code: overrides.code ?? "CCU",
    label: overrides.label ?? "Cardiac Care Unit",
    description: overrides.description,
    isActive: overrides.isActive ?? true,
    createdAt: overrides.createdAt ?? NOW,
    updatedAt: overrides.updatedAt ?? NOW
  };
}

function createDutyDesign(overrides: Partial<DutyDesign> = {}): DutyDesign {
  return {
    id: overrides.id ?? "design-a",
    code: overrides.code ?? "DESIGN_A",
    label: overrides.label ?? "Design A",
    description: overrides.description,
    isActive: overrides.isActive ?? true,
    isHolidayDesign: overrides.isHolidayDesign ?? false,
    dutyBlocks: overrides.dutyBlocks ?? [
      {
        shiftTypeId: "shift-type-day",
        locationId: "location-ccu",
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

function createEmptyRosterSnapshotRepository() {
  return {
    list: async () => [],
    findById: async () => null,
    save: async (snapshot: never) => snapshot
  };
}

function renderPage(options?: { readonly dutyDesigns?: ReadonlyArray<DutyDesign> }) {
  const auditLogService = createNoopAuditLogService();
  const shiftTypeRepository = new InMemoryShiftTypeRepository([createShiftType()]);
  const dutyLocationRepository = new InMemoryDutyLocationRepository([createLocation()]);
  const dutyDesignRepository = new InMemoryDutyDesignRepository(options?.dutyDesigns ?? []);
  const dutyDesignAssignmentRepository = new InMemoryDutyDesignAssignmentRepository();

  mockUseAppServices.mockReturnValue({
    shiftTypeManagementService: createShiftTypeManagementService({
      shiftTypeRepository,
      dutyDesignRepository,
      biasCriteriaRepository: new InMemoryBiasCriteriaRepository(),
      rosterSnapshotRepository: createEmptyRosterSnapshotRepository() as never,
      auditLogService
    }),
    dutyLocationManagementService: createDutyLocationManagementService({
      dutyLocationRepository,
      biasCriteriaRepository: new InMemoryBiasCriteriaRepository(),
      rosterSnapshotRepository: createEmptyRosterSnapshotRepository() as never,
      auditLogService
    }),
    dutyDesignManagementService: createDutyDesignManagementService({
      dutyDesignRepository,
      dutyDesignAssignmentRepository,
      shiftTypeRepository,
      dutyLocationRepository,
      rosterSnapshotRepository: createEmptyRosterSnapshotRepository() as never,
      auditLogService
    })
  });
  mockUseAuth.mockReturnValue({
    user: { id: "user-admin-demo" },
    role: "ADMIN"
  });

  return render(
    <MemoryRouter>
      <AdminDutyDesignPage />
    </MemoryRouter>
  );
}

describe("AdminDutyDesignPage", () => {
  beforeEach(() => {
    mockUseAppServices.mockReset();
    mockUseAuth.mockReset();
    vi.restoreAllMocks();
  });

  it("creates a duty design and supports block row add/remove interactions", async () => {
    const user = userEvent.setup();
    renderPage();

    await screen.findByText("Design Records");

    await user.type(screen.getByLabelText("Code"), "weekday_primary");
    await user.type(screen.getByLabelText("Label"), "Weekday Primary");
    await user.type(screen.getByLabelText("Description"), "Primary weekday design");
    await user.selectOptions(screen.getByLabelText("Shift Type"), "shift-type-day");
    await user.selectOptions(screen.getByLabelText("Location"), "location-ccu");
    await user.clear(screen.getByLabelText("Doctor Count"));
    await user.type(screen.getByLabelText("Doctor Count"), "2");

    await user.click(screen.getByRole("button", { name: "Add Block" }));
    expect(screen.getByText("Block 2")).toBeInTheDocument();

    const removeButtons = screen.getAllByRole("button", { name: "Remove" });
    await user.click(removeButtons[1]!);
    expect(screen.queryByText("Block 2")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Create Duty Design" }));

    expect(await screen.findByText("Created Weekday Primary.")).toBeInTheDocument();
    expect((await screen.findAllByText("Weekday Primary")).length).toBeGreaterThan(0);
  });

  it("shows cycle validation errors inline when follow-up chains become cyclic", async () => {
    const user = userEvent.setup();
    renderPage({
      dutyDesigns: [
        createDutyDesign({
          id: "design-a",
          code: "DESIGN_A",
          label: "Design A",
          dutyBlocks: [
            {
              shiftTypeId: "shift-type-day",
              locationId: "location-ccu",
              doctorCount: 1,
              followUpDutyDesignId: "design-b"
            }
          ]
        }),
        createDutyDesign({
          id: "design-b",
          code: "DESIGN_B",
          label: "Design B"
        })
      ]
    });

    await user.click(await screen.findByRole("button", { name: /Design B/i }));
    await user.selectOptions(screen.getByLabelText("Follow-Up Duty Design"), "design-a");
    await user.click(screen.getByRole("button", { name: "Save Changes" }));

    expect(
      await screen.findByText("Duty design follow-up chain cannot contain cycles.")
    ).toBeInTheDocument();
  });
});
