import type { OffRequest, Shift } from "@/domain/models";
import {
  readBiasBucketValue,
  readWeekdayPairBiasBucketValue,
  resolveShiftBiasBucket,
  resolveShiftWeekdayPairBiasBucket
} from "@/domain/scheduling/biasBuckets";
import type {
  CandidateScore,
  ScoreCandidatesInput
} from "@/domain/scheduling/contracts";
import { getDoctorFairnessLoadSnapshot } from "@/domain/scheduling/fairnessState";

function hasConflictingOffRequest(
  offRequest: OffRequest,
  shift: Shift
): boolean {
  if (offRequest.date !== shift.date) {
    return false;
  }

  if (offRequest.shiftPreference === "FULL_DAY") {
    return true;
  }

  if (shift.type === "CUSTOM") {
    return false;
  }

  return offRequest.shiftPreference === shift.type;
}

function findConflictingOffRequest(
  doctorId: string,
  shift: Shift,
  offRequests: ReadonlyArray<OffRequest>
): OffRequest | null {
  return (
    offRequests.find(
      (offRequest) =>
        offRequest.doctorId === doctorId &&
        hasConflictingOffRequest(offRequest, shift)
    ) ?? null
  );
}

function resolveOffRequestPenalty(
  request: OffRequest | null,
  input: ScoreCandidatesInput
): number {
  if (!request) {
    return 0;
  }

  return (6 - request.priority) * input.config.scoring.offRequestPenaltyWeight;
}

function compareCandidateScores(
  left: CandidateScore,
  right: CandidateScore,
  input: ScoreCandidatesInput
): number {
  for (const tieBreaker of input.config.deterministicTieBreakers) {
    switch (tieBreaker) {
      case "totalScore":
        if (left.totalScore !== right.totalScore) {
          return left.totalScore - right.totalScore;
        }
        break;
      case "bucketAssignedCount":
        if (
          left.tieBreak.bucketAssignedCount !== right.tieBreak.bucketAssignedCount
        ) {
          return (
            left.tieBreak.bucketAssignedCount - right.tieBreak.bucketAssignedCount
          );
        }
        break;
      case "weekdayPairAssignedCount":
        if (
          left.tieBreak.weekdayPairAssignedCount !==
          right.tieBreak.weekdayPairAssignedCount
        ) {
          return (
            left.tieBreak.weekdayPairAssignedCount -
            right.tieBreak.weekdayPairAssignedCount
          );
        }
        break;
      case "totalAssignedCount":
        if (left.tieBreak.totalAssignedCount !== right.tieBreak.totalAssignedCount) {
          return left.tieBreak.totalAssignedCount - right.tieBreak.totalAssignedCount;
        }
        break;
      case "offRequestPenalty":
        if (left.tieBreak.offRequestPenalty !== right.tieBreak.offRequestPenalty) {
          return left.tieBreak.offRequestPenalty - right.tieBreak.offRequestPenalty;
        }
        break;
      case "doctorId":
        if (left.tieBreak.doctorId !== right.tieBreak.doctorId) {
          return left.tieBreak.doctorId.localeCompare(right.tieBreak.doctorId);
        }
        break;
    }
  }

  return 0;
}

export function scoreCandidates(
  input: ScoreCandidatesInput
): ReadonlyArray<CandidateScore> {
  const eligibleCandidates = input.eligibility.filter((entry) => entry.isEligible);
  const biasBucket = resolveShiftBiasBucket(input.shift);
  const weekdayPairBiasBucket = resolveShiftWeekdayPairBiasBucket(input.shift);

  return eligibleCandidates
    .map((candidate) => {
      const biasEntry = input.currentBias.find(
        (ledger) => ledger.doctorId === candidate.doctorId
      );
      const weekdayPairBiasEntry = input.currentWeekdayPairBias.find(
        (ledger) => ledger.doctorId === candidate.doctorId
      );
      const fairnessLoad = getDoctorFairnessLoadSnapshot(
        input.fairnessState,
        candidate.doctorId
      );
      const conflictingOffRequest = findConflictingOffRequest(
        candidate.doctorId,
        input.shift,
        input.offRequests
      );
      const offRequestPenalty = resolveOffRequestPenalty(conflictingOffRequest, input);
      const primaryBiasScore =
        biasEntry && biasBucket
          ? readBiasBucketValue(biasEntry.balance, biasBucket) *
            input.config.scoring.biasWeight
          : 0;
      const bucketAssignedCount = biasBucket
        ? fairnessLoad.assignedByBucket[biasBucket]
        : 0;
      const primaryBucketLoadScore =
        bucketAssignedCount * input.config.scoring.bucketAssignedWeight;
      const weekdayPairAssignedCount = weekdayPairBiasBucket
        ? fairnessLoad.assignedByWeekdayPair[weekdayPairBiasBucket]
        : 0;
      const secondaryWeekdayPairBiasScore =
        weekdayPairBiasEntry && weekdayPairBiasBucket
          ? readWeekdayPairBiasBucketValue(
              weekdayPairBiasEntry.balance,
              weekdayPairBiasBucket
            ) * input.config.scoring.weekdayPairBiasWeight
          : 0;
      const secondaryWeekdayPairLoadScore =
        weekdayPairAssignedCount * input.config.scoring.weekdayPairAssignedWeight;
      const overallLoadScore =
        fairnessLoad.totalAssignedCount * input.config.scoring.overallAssignedWeight;

      const breakdown = {
        primaryBiasScore,
        primaryBucketLoadScore,
        secondaryWeekdayPairBiasScore,
        secondaryWeekdayPairLoadScore,
        offRequestPenalty,
        overallLoadScore
      };

      const notes = [
        "Primary weekday/weekend bucket fairness is scored before secondary weekday pair fairness.",
        "Lower scores win, then deterministic tie-breakers are applied."
      ];

      if (!biasBucket || !weekdayPairBiasBucket) {
        notes.push(
          "Weekend shifts and weekday custom shifts use neutral weekday-pair bias and load scoring in V1."
        );
      }

      return {
        doctorId: candidate.doctorId,
        totalScore:
          breakdown.primaryBiasScore +
          breakdown.primaryBucketLoadScore +
          breakdown.secondaryWeekdayPairBiasScore +
          breakdown.secondaryWeekdayPairLoadScore +
          breakdown.offRequestPenalty +
          breakdown.overallLoadScore,
        breakdown,
        tieBreak: {
          bucketAssignedCount,
          weekdayPairAssignedCount,
          totalAssignedCount: fairnessLoad.totalAssignedCount,
          offRequestPenalty,
          offRequestPriority: conflictingOffRequest?.priority ?? null,
          doctorId: candidate.doctorId
        },
        biasBucket,
        weekdayPairBiasBucket,
        notes
      };
    })
    .sort((left, right) => compareCandidateScores(left, right, input));
}
