import type { Assignment } from "@/domain/models";
import { DEFAULT_SCHEDULING_ENGINE_CONFIG } from "@/domain/scheduling/config";
import type {
  GenerateRosterInput,
  GenerateRosterOutput
} from "@/domain/scheduling/contracts";
import { checkShiftEligibility } from "@/domain/scheduling/checkEligibility";
import { generateShiftPool } from "@/domain/scheduling/generateShiftPool";
import { scoreCandidates } from "@/domain/scheduling/scoreCandidates";
import { validateGeneratedRoster } from "@/domain/scheduling/validateRoster";

export function generateRoster(
  input: GenerateRosterInput
): GenerateRosterOutput {
  const config = input.config ?? DEFAULT_SCHEDULING_ENGINE_CONFIG;
  const warnings = new Set<string>();
  const assignments: Assignment[] = [];

  const shifts = generateShiftPool({
    rosterId: input.rosterId,
    range: input.range,
    shiftTypes: input.shiftTypes,
    weekendGroupSchedule: input.weekendGroupSchedule
  });

  warnings.add(
    "TODO: Full assignment orchestration is scaffolded only; final scheduling logic is still pending."
  );
  warnings.add(
    "TODO: Bias ledger updates currently return the incoming ledger unchanged."
  );

  for (const shift of shifts) {
    const eligibility = checkShiftEligibility({
      shift,
      doctors: input.doctors,
      leaves: input.leaves,
      weekendGroupSchedule: input.weekendGroupSchedule
    });

    const candidateScores = scoreCandidates({
      shift,
      eligibility,
      currentBias: input.currentBias,
      offRequests: input.offRequests,
      config
    });

    if (candidateScores.length === 0) {
      warnings.add(`No eligible candidates resolved for shift ${shift.id}.`);
    }
  }

  const validation = validateGeneratedRoster({
    shifts,
    assignments
  });

  return {
    shifts,
    assignments,
    updatedBias: input.currentBias,
    validation,
    warnings: Array.from(warnings)
  };
}

