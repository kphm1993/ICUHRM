import type { BiasLedger, OffRequest, Shift } from "@/domain/models";
import type {
  CandidateScore,
  CandidateScoreBreakdown,
  ScoreCandidatesInput
} from "@/domain/scheduling/contracts";

function resolveBiasDimension(shift: Shift): keyof BiasLedger["balance"] | null {
  if (shift.type === "CUSTOM") {
    return null;
  }

  if (shift.category === "WEEKEND") {
    return shift.type === "DAY" ? "weekendDay" : "weekendNight";
  }

  return shift.type === "DAY" ? "weekdayDay" : "weekdayNight";
}

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

export function scoreCandidates(
  input: ScoreCandidatesInput
): ReadonlyArray<CandidateScore> {
  const eligibleCandidates = input.eligibility.filter((entry) => entry.isEligible);
  const biasDimension = resolveBiasDimension(input.shift);

  return eligibleCandidates
    .map((candidate) => {
      const biasEntry = input.currentBias.find(
        (ledger) => ledger.doctorId === candidate.doctorId
      );
      const relevantOffRequest = input.offRequests.find(
        (offRequest) =>
          offRequest.doctorId === candidate.doctorId &&
          hasConflictingOffRequest(offRequest, input.shift)
      );

      const breakdown: CandidateScoreBreakdown = {
        biasCorrection:
          biasEntry && biasDimension
            ? biasEntry.balance[biasDimension] * input.config.scoring.biasCorrection
            : 0,
        fairnessDeficit: 0,
        offRequestPenalty: relevantOffRequest
          ? relevantOffRequest.priority * input.config.scoring.offRequestPenalty
          : 0,
        overAssignmentPenalty: 0
      };

      const notes = [
        "TODO: fairness ratio scoring is not implemented yet.",
        "TODO: over-assignment penalties are not implemented yet."
      ];

      if (!biasDimension) {
        notes.push("Custom shift bias mapping is deferred for V1 foundation work.");
      }

      return {
        doctorId: candidate.doctorId,
        totalScore:
          breakdown.biasCorrection +
          breakdown.fairnessDeficit +
          breakdown.offRequestPenalty +
          breakdown.overAssignmentPenalty,
        breakdown,
        notes
      };
    })
    .sort((left, right) => {
      if (left.totalScore !== right.totalScore) {
        return left.totalScore - right.totalScore;
      }

      return left.doctorId.localeCompare(right.doctorId);
    });
}

