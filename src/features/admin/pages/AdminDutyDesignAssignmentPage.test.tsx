import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DutyDesign } from "@/domain/models";
import type { AuditLogService } from "@/features/audit/services/auditLogService";
import { AdminDutyDesignAssignmentPage } from "@/features/admin/pages/AdminDutyDesignAssignmentPage";
import { createDutyDesignAssignmentService } from "@/features/dutyDesigns/services/dutyDesignAssignmentService";
import { createDutyDesignManagementService } from "@/features/dutyDesigns/services/dutyDesignManagementService";
import {
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

function renderPage() {
  const dutyDesignRepository = new InMemoryDutyDesignRepository([
    createDutyDesign(),
    createDutyDesign({
      id: "design-holiday",
      code: "HOLIDAY",
      label: "Holiday Design"
    })
  ]);
  const dutyDesignAssignmentRepository = new InMemoryDutyDesignAssignmentRepository();
  const auditLogService = createNoopAuditLogService();

  mockUseAppServices.mockReturnValue({
    dutyDesignManagementService: createDutyDesignManagementService({
      dutyDesignRepository,
      dutyDesignAssignmentRepository,
      shiftTypeRepository: new InMemoryShiftTypeRepository([
        {
          id: "shift-type-day",
          code: "DAY",
          label: "Day",
          startTime: "08:00",
          endTime: "20:00",
          category: "DAY",
          isActive: true,
          createdAt: NOW,
          updatedAt: NOW
        }
      ]),
      dutyLocationRepository: new InMemoryDutyLocationRepository([
        {
          id: "location-ccu",
          code: "CCU",
          label: "Cardiac Care Unit",
          isActive: true,
          createdAt: NOW,
          updatedAt: NOW
        }
      ]),
      rosterSnapshotRepository: createEmptyRosterSnapshotRepository() as never,
      auditLogService
    }),
    dutyDesignAssignmentService: createDutyDesignAssignmentService({
      dutyDesignAssignmentRepository,
      dutyDesignRepository,
      auditLogService
    })
  });
  mockUseAuth.mockReturnValue({
    user: { id: "user-admin-demo" },
    role: "ADMIN"
  });

  return render(
    <MemoryRouter>
      <AdminDutyDesignAssignmentPage />
    </MemoryRouter>
  );
}

describe("AdminDutyDesignAssignmentPage", () => {
  beforeEach(() => {
    mockUseAppServices.mockReset();
    mockUseAuth.mockReset();
    vi.restoreAllMocks();
  });

  it("assigns across multiple selected dates and supports unassigning a single assignment", async () => {
    const user = userEvent.setup();
    vi.spyOn(window, "confirm").mockReturnValue(true);
    renderPage();

    await screen.findByText("Monthly Assignment Calendar");
    await user.clear(screen.getByLabelText("Roster Month"));
    await user.type(screen.getByLabelText("Roster Month"), "2026-04");

    await user.click(
      await screen.findByRole("button", {
        name: "Toggle assignment date 2026-04-10"
      })
    );
    await user.click(
      screen.getByRole("button", {
        name: "Toggle assignment date 2026-04-11"
      })
    );
    await user.selectOptions(
      screen.getByLabelText("Duty Design"),
      "design-weekday"
    );
    await user.click(screen.getByRole("button", { name: "Assign Duty Design" }));

    expect(
      await screen.findByText("Assigned Weekday Design to 2 dates.")
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", {
        name: "Toggle assignment date 2026-04-10"
      })
    );
    await user.selectOptions(
      screen.getByLabelText("Duty Design"),
      "design-holiday"
    );
    await user.click(
      screen.getByRole("checkbox", { name: /Holiday override/i })
    );
    await user.click(screen.getByRole("button", { name: "Assign Duty Design" }));

    expect(await screen.findByText("Holiday Design")).toBeInTheDocument();
    expect(screen.getAllByText("Weekday Design").length).toBeGreaterThanOrEqual(1);

    await user.click(
      screen.getByRole("button", {
        name: "Remove Weekday Design from 2026-04-10"
      })
    );

    await waitFor(() => {
      expect(screen.queryByText("Removed assignment on 2026-04-10.")).toBeInTheDocument();
    });
  });
});
