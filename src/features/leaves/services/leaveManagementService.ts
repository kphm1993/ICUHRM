import type { EntityId, Leave } from "@/domain/models";
import { notImplemented } from "@/shared/lib/notImplemented";

export interface CreateLeaveInput {
  readonly doctorId: EntityId;
  readonly startDate: string;
  readonly endDate: string;
  readonly reason?: string;
}

export interface UpdateLeaveInput {
  readonly startDate: string;
  readonly endDate: string;
  readonly reason?: string;
}

export interface LeaveManagementService {
  listLeaves(rangeStart?: string, rangeEnd?: string): Promise<ReadonlyArray<Leave>>;
  createLeave(input: CreateLeaveInput): Promise<Leave>;
  updateLeave(leaveId: EntityId, input: UpdateLeaveInput): Promise<Leave>;
  deleteLeave(leaveId: EntityId): Promise<void>;
}

export function createLeaveManagementServicePlaceholder(): LeaveManagementService {
  return {
    async listLeaves() {
      throw notImplemented("LeaveManagementService.listLeaves");
    },
    async createLeave() {
      throw notImplemented("LeaveManagementService.createLeave");
    },
    async updateLeave() {
      throw notImplemented("LeaveManagementService.updateLeave");
    },
    async deleteLeave() {
      throw notImplemented("LeaveManagementService.deleteLeave");
    }
  };
}

