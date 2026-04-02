import type {
  EntityId,
  OffRequest,
  OffRequestShiftPreference,
  PriorityLevel,
  YearMonthString
} from "@/domain/models";
import type {
  OffRequestRepository,
  RosterSnapshotRepository
} from "@/domain/repositories";
import { RepositoryNotFoundError } from "@/domain/repositories";
import { parseIsoDate } from "@/domain/scheduling/dateUtils";

export interface SubmitOffRequestInput {
  readonly doctorId: EntityId;
  readonly rosterMonth: YearMonthString;
  readonly date: string;
  readonly shiftPreference: OffRequestShiftPreference;
  readonly priority: PriorityLevel;
}

export interface OffRequestService {
  listRequests(rosterMonth: YearMonthString): Promise<ReadonlyArray<OffRequest>>;
  submitRequest(input: SubmitOffRequestInput): Promise<OffRequest>;
  cancelRequest(requestId: EntityId): Promise<void>;
}

export interface OffRequestServiceDependencies {
  readonly offRequestRepository: OffRequestRepository;
  readonly rosterSnapshotRepository: RosterSnapshotRepository;
}

function isWeekendDate(date: string): boolean {
  const dayOfWeek = parseIsoDate(date).getUTCDay();
  return dayOfWeek === 0 || dayOfWeek === 6;
}

async function assertMonthIsNotLocked(
  rosterMonth: YearMonthString,
  rosterSnapshotRepository: RosterSnapshotRepository
): Promise<void> {
  const lockedSnapshots = await rosterSnapshotRepository.list({
    rosterMonth,
    statuses: ["LOCKED"]
  });

  if (lockedSnapshots.length > 0) {
    throw new Error(
      `Off requests are locked for roster month '${rosterMonth}' because the roster is locked.`
    );
  }
}

export function createOffRequestService(
  dependencies: OffRequestServiceDependencies
): OffRequestService {
  return {
    async listRequests(rosterMonth) {
      return dependencies.offRequestRepository.list({ rosterMonth });
    },
    async submitRequest(input) {
      await assertMonthIsNotLocked(
        input.rosterMonth,
        dependencies.rosterSnapshotRepository
      );

      if (isWeekendDate(input.date)) {
        throw new Error("Weekend off requests are not allowed.");
      }

      // TODO: Enforce the off-request submission window and duplicate request policy.
      const timestamp = new Date().toISOString();

      return dependencies.offRequestRepository.save({
        id: crypto.randomUUID(),
        doctorId: input.doctorId,
        rosterMonth: input.rosterMonth,
        date: input.date,
        shiftPreference: input.shiftPreference,
        priority: input.priority,
        requestedAt: timestamp,
        createdAt: timestamp,
        updatedAt: timestamp
      });
    },
    async cancelRequest(requestId) {
      const existingRequest =
        await dependencies.offRequestRepository.findById(requestId);

      if (!existingRequest) {
        throw new RepositoryNotFoundError(
          `Off request '${requestId}' was not found.`
        );
      }

      await assertMonthIsNotLocked(
        existingRequest.rosterMonth,
        dependencies.rosterSnapshotRepository
      );

      await dependencies.offRequestRepository.delete(requestId);
    }
  };
}
