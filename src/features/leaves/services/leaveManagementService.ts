import type { EntityId, ISODateString, Leave } from "@/domain/models";
import type { LeaveRepository } from "@/domain/repositories";
import { RepositoryNotFoundError } from "@/domain/repositories";

export interface CreateLeaveInput {
  readonly doctorId: EntityId;
  readonly startDate: ISODateString;
  readonly endDate: ISODateString;
  readonly reason?: string;
  readonly createdByUserId: EntityId;
}

export interface UpdateLeaveInput {
  readonly startDate: ISODateString;
  readonly endDate: ISODateString;
  readonly reason?: string;
}

export interface LeaveManagementService {
  listLeaves(
    rangeStart?: ISODateString,
    rangeEnd?: ISODateString
  ): Promise<ReadonlyArray<Leave>>;
  createLeave(input: CreateLeaveInput): Promise<Leave>;
  updateLeave(leaveId: EntityId, input: UpdateLeaveInput): Promise<Leave>;
  deleteLeave(leaveId: EntityId): Promise<void>;
}

export interface LeaveManagementServiceDependencies {
  readonly leaveRepository: LeaveRepository;
}

export function createLeaveManagementService(
  dependencies: LeaveManagementServiceDependencies
): LeaveManagementService {
  return {
    async listLeaves(rangeStart, rangeEnd) {
      return dependencies.leaveRepository.list({
        rangeStart,
        rangeEnd
      });
    },
    async createLeave(input) {
      const timestamp = new Date().toISOString();

      return dependencies.leaveRepository.save({
        id: crypto.randomUUID(),
        doctorId: input.doctorId,
        startDate: input.startDate,
        endDate: input.endDate,
        reason: input.reason,
        createdByUserId: input.createdByUserId,
        createdAt: timestamp,
        updatedAt: timestamp
      });
    },
    async updateLeave(leaveId, input) {
      const leave = await dependencies.leaveRepository.findById(leaveId);

      if (!leave) {
        throw new RepositoryNotFoundError(`Leave '${leaveId}' was not found.`);
      }

      return dependencies.leaveRepository.save({
        ...leave,
        startDate: input.startDate,
        endDate: input.endDate,
        reason: input.reason,
        updatedAt: new Date().toISOString()
      });
    },
    async deleteLeave(leaveId) {
      await dependencies.leaveRepository.delete(leaveId);
    }
  };
}
