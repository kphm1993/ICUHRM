import type { Leave } from "@/domain/models";
import type { LeaveRepository, LeaveRepositoryFilter } from "@/domain/repositories";
import {
  RepositoryConflictError,
  RepositoryNotFoundError
} from "@/domain/repositories";

function cloneLeave(leave: Leave): Leave {
  return { ...leave };
}

function sortLeaves(leaves: ReadonlyArray<Leave>): ReadonlyArray<Leave> {
  return [...leaves].sort((left, right) => {
    const startDateComparison = left.startDate.localeCompare(right.startDate);
    if (startDateComparison !== 0) {
      return startDateComparison;
    }

    const doctorComparison = left.doctorId.localeCompare(right.doctorId);
    return doctorComparison !== 0
      ? doctorComparison
      : left.id.localeCompare(right.id);
  });
}

function overlapsRequestedRange(
  leave: Leave,
  filter: LeaveRepositoryFilter | undefined
): boolean {
  if (!filter?.rangeStart && !filter?.rangeEnd) {
    return true;
  }

  if (filter.rangeStart && leave.endDate < filter.rangeStart) {
    return false;
  }

  if (filter.rangeEnd && leave.startDate > filter.rangeEnd) {
    return false;
  }

  return true;
}

export class InMemoryLeaveRepository implements LeaveRepository {
  private readonly leavesById = new Map<string, Leave>();

  constructor(seedData: ReadonlyArray<Leave> = []) {
    for (const leave of seedData) {
      this.assertUniqueConstraints(leave);
      this.leavesById.set(leave.id, cloneLeave(leave));
    }
  }

  async list(filter?: LeaveRepositoryFilter): Promise<ReadonlyArray<Leave>> {
    const leaves = Array.from(this.leavesById.values()).filter((leave) => {
      if (filter?.doctorId !== undefined && leave.doctorId !== filter.doctorId) {
        return false;
      }

      return overlapsRequestedRange(leave, filter);
    });

    return sortLeaves(leaves).map(cloneLeave);
  }

  async findById(id: string): Promise<Leave | null> {
    const leave = this.leavesById.get(id);
    return leave ? cloneLeave(leave) : null;
  }

  async save(leave: Leave): Promise<Leave> {
    this.assertUniqueConstraints(leave);
    this.leavesById.set(leave.id, cloneLeave(leave));
    return cloneLeave(leave);
  }

  async delete(id: string): Promise<void> {
    const wasDeleted = this.leavesById.delete(id);

    if (!wasDeleted) {
      throw new RepositoryNotFoundError(`Leave '${id}' was not found.`);
    }
  }

  private assertUniqueConstraints(candidate: Leave): void {
    for (const existingLeave of this.leavesById.values()) {
      if (existingLeave.id === candidate.id) {
        return;
      }
    }

    if (this.leavesById.has(candidate.id)) {
      throw new RepositoryConflictError(`Leave id '${candidate.id}' is already in use.`);
    }
  }
}

