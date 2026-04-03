import type { OffRequest, Shift } from "@/domain/models";
import type {
  CandidateScore,
  ScoreCandidatesInput
} from "@/domain/scheduling/contracts";
import {
  getDoctorFairnessLoadSnapshot,
  sumAssignedCountsForCriteria
} from "@/domain/scheduling/fairnessState";

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
      case "criteriaAssignedCount":
        if (
          left.tieBreak.criteriaAssignedCount !== right.tieBreak.criteriaAssignedCount
        ) {
          return (
            left.tieBreak.criteriaAssignedCount - right.tieBreak.criteriaAssignedCount
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
  const matchedCriteriaIds = input.matchingCriteria.map((criteria) => criteria.id);

  return eligibleCandidates
    .map((candidate) => {
      const biasEntry = input.currentBias.find(
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
      const criteriaBiasScore = matchedCriteriaIds.reduce((sum, criteriaId) => {
        const currentBias = biasEntry?.balances[criteriaId] ?? 0;
        return sum + currentBias * input.config.scoring.criteriaBiasWeight;
      }, 0);
      const criteriaAssignedCount = sumAssignedCountsForCriteria(
        fairnessLoad,
        matchedCriteriaIds
      );
      const criteriaAssignedLoadScore =
        criteriaAssignedCount * input.config.scoring.criteriaAssignedWeight;
      const overallLoadScore =
        fairnessLoad.totalAssignedCount * input.config.scoring.overallAssignedWeight;

      const breakdown = {
        criteriaBiasScore,
        criteriaAssignedLoadScore,
        offRequestPenalty,
        overallLoadScore
      };

      const notes = [
        "Primary fairness is scored from the matched active bias criteria for this shift.",
        "Lower scores win, then deterministic tie-breakers are applied."
      ];

      if (matchedCriteriaIds.length === 0) {
        notes.push(
          "No active bias criteria matched this shift, so scoring used only off-request and overall assignment load."
        );
      }

      return {
        doctorId: candidate.doctorId,
        totalScore:
          breakdown.criteriaBiasScore +
          breakdown.criteriaAssignedLoadScore +
          breakdown.offRequestPenalty +
          breakdown.overallLoadScore,
        breakdown,
        tieBreak: {
          criteriaAssignedCount,
          totalAssignedCount: fairnessLoad.totalAssignedCount,
          offRequestPenalty,
          offRequestPriority: conflictingOffRequest?.priority ?? null,
          doctorId: candidate.doctorId
        },
        matchedCriteriaIds,
        notes
      };
    })
    .sort((left, right) => compareCandidateScores(left, right, input));
}
