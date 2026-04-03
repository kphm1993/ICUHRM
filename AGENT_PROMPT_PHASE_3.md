# AGENT IMPLEMENTATION: PHASE 3 — Scheduler Updates

## OBJECTIVE
Update the roster generation engine to use dynamic bias criteria instead of hardcoded buckets. Ensure shift-to-criteria matching is deterministic and testable.

## DEPENDENCIES
- Phase 1 & 2 must be complete
- All models, repositories, and services must be in place

## DELIVERABLES

### 1. Create Bias Criteria Matching Helper
File: `src/domain/scheduling/determineBiasCriteria.ts` (new file)

```typescript
import type {
  Shift,
  BiasCriteria,
  DayOfWeek,
  ShiftType
} from "@/domain/models";
import type { DutyLocation } from "@/domain/models/DutyLocation";

/**
 * Determine which bias criteria match a given shift and location.
 * A criteria matches if:
 * 1. Location is in criteria.locationIds (or locationIds is empty = all)
 * 2. Shift type is in criteria.shiftTypeIds (or shiftTypeIds is empty = all)
 * 3. Day of week is in criteria.weekdayConditions (or weekdayConditions is empty = all)
 * 4. If isWeekendOnly = true, the day must be SAT or SUN
 */
export function determineBiasCriteriaForShift(input: {
  shift: Shift;
  shiftType: ShiftType;
  location: DutyLocation;
  activeCriteria: ReadonlyArray<BiasCriteria>;
}): ReadonlyArray<BiasCriteria> {
  const { shift, shiftType, location, activeCriteria } = input;

  const dayOfWeek = getDayOfWeekFromDate(shift.date);
  const isWeekend = shift.category === 'WEEKEND'; // or use dayOfWeek

  return activeCriteria.filter(criteria => {
    // Filter 1: Location match
    if (
      criteria.locationIds.length > 0 &&
      !criteria.locationIds.includes(location.id)
    ) {
      return false;
    }

    // Filter 2: Shift type match
    if (
      criteria.shiftTypeIds.length > 0 &&
      !criteria.shiftTypeIds.includes(shiftType.id)
    ) {
      return false;
    }

    // Filter 3: Weekday conditions match
    if (criteria.weekdayConditions.length > 0) {
      if (!criteria.weekdayConditions.includes(dayOfWeek)) {
        return false;
      }
    }

    // Filter 4: Weekend-only constraint
    if (criteria.isWeekendOnly && !isWeekend) {
      return false;
    }

    return true;
  });
}

/**
 * Extract day of week from ISO date string (YYYY-MM-DD)
 * Monday = MON, Tuesday = TUE, etc.
 */
function getDayOfWeekFromDate(isoDateString: string): DayOfWeek {
  const date = new Date(isoDateString + 'T00:00:00Z');
  const dayIndex = date.getUTCDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  const daysOfWeek: DayOfWeek[] = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  return daysOfWeek[dayIndex];
}
```

### 2. Update fairnessState.ts
File: `src/domain/scheduling/fairnessState.ts`

**Changes:**

a) Replace `BiasBalance` references with dynamic criteria:

OLD:
```typescript
export interface FairnessWorkingState {
  bias: Record<EntityId, BiasBalance>;
  ... other fields
}
```

NEW:
```typescript
export interface FairnessWorkingState {
  bias: Record<EntityId, Record<EntityId, number>>; // doctorId -> criteriaId -> value
  criteriaIds: ReadonlyArray<EntityId>; // List of active criteria IDs
  ... other fields
}
```

b) Update `initializeFairnessWorkingState()`:

```typescript
export function initializeFairnessWorkingState(input: {
  doctors: ReadonlyArray<Doctor>;
  activeCriteria: ReadonlyArray<BiasCriteria>;
  currentBias: ReadonlyArray<BiasLedger>;
}): FairnessWorkingState {
  // For each doctor, create a bias bucket for each active criteria
  const bias: Record<EntityId, Record<EntityId, number>> = {};
  for (const doctor of input.doctors) {
    bias[doctor.id] = {};
    for (const criteria of input.activeCriteria) {
      bias[doctor.id][criteria.id] = currentBias
        .find(b => b.doctorId === doctor.id)?.[criteria.id] ?? 0;
    }
  }

  return {
    bias,
    criteriaIds: input.activeCriteria.map(c => c.id),
    // ... initialize other fields as before
  };
}
```

c) Update `recordAssignmentForShift()`:

OLD signature:
```typescript
function recordAssignmentForShift(
  state: FairnessWorkingState,
  doctorId: EntityId,
  shift: Shift
): void
```

NEW signature:
```typescript
function recordAssignmentForShift(
  state: FairnessWorkingState,
  doctorId: EntityId,
  shift: Shift,
  matchingCriteria: ReadonlyArray<EntityId> // criteria IDs that match this shift
): void {
  // Increment bias for each matching criteria
  for (const criteriaId of matchingCriteria) {
    if (state.bias[doctorId]?.[criteriaId] !== undefined) {
      state.bias[doctorId][criteriaId]++;
    }
  }
  // ... rest of assignment recording logic
}
```

d) Update `recordEligibilityForShift()` similarly if tracking eligibility by criteria.

e) Update `computeAvailabilityAwareFairShare()` to compute per-criteria fair share:

OLD: computes 4 hardcoded fair shares
NEW: computes fair share for each active criteria dynamically

### 3. Update generateRoster.ts
File: `src/domain/scheduling/generateRoster.ts`

**Changes:**

a) Update function signature:

```typescript
export async function generateRoster(
  input: GenerateRosterInput
): Promise<GenerateRosterOutput> {
  // ... existing code ...

  // NEW: Load active bias criteria
  const activeBiasCriteria = await biasCriteriaRepository.listActive();

  if (activeBiasCriteria.length === 0) {
    throw new NoCriteriaDefinedError(
      'No bias criteria defined. Admin must create at least one criteria before generating roster.'
    );
  }

  // Initialize fairness state with dynamic criteria
  const fairnessState = initializeFairnessWorkingState({
    doctors: input.doctors,
    activeCriteria: activeBiasCriteria,
    currentBias: input.currentBias
  });

  // ... existing assignment loop ...

  // For each shift, determine matching criteria
  for (const shift of shifts) {
    const shiftType = shiftTypeMap[shift.shiftTypeId];
    const location = locationMap[shift.locationId]; // NEW

    const matchingCriteria = determineBiasCriteriaForShift({
      shift,
      shiftType,
      location,
      activeCriteria: activeBiasCriteria
    });

    const candidateIds = filterEligibleDoctors(shift, state);
    const scoredCandidates = scoreCandidates({
      candidates: candidateIds,
      shift,
      fairnessState,
      matchingCriteria, // NEW
      // ... other params
    });

    const selectedDoctorId = scoredCandidates[0].doctorId;
    const assignment = createAssignment(selectedDoctorId, shift, location);
    assignments.push(assignment);

    recordAssignmentForShift(
      fairnessState,
      selectedDoctorId,
      shift,
      matchingCriteria.map(c => c.id) // NEW
    );
  }

  // ... rest of validation and output ...
}
```

b) Update `GenerateRosterInput` type to include:
```typescript
activeBiasCriteria: ReadonlyArray<BiasCriteria>;
activeDutyLocations: ReadonlyArray<DutyLocation>;
```

### 4. Update scoreCandidates.ts
File: `src/domain/scheduling/scoreCandidates.ts`

**Changes:**

a) Update function signature:

```typescript
export function scoreCandidates(input: {
  candidates: ReadonlyArray<EntityId>;
  shift: Shift;
  fairnessState: FairnessWorkingState;
  matchingCriteria: ReadonlyArray<BiasCriteria>; // NEW
  // ... existing params
}): ScoredCandidate[] {
  // When computing bias_correction score, use matchingCriteria IDs
  // For each matching criteria, compute how much this doctor deviates from fair share
  
  let biasCorrection = 0;
  for (const criteria of matchingCriteria) {
    const currentBias = input.fairnessState.bias[candidateId]?.[criteria.id] ?? 0;
    const fairShare = computeAvailabilityAwareFairShare(/* ... by criteria ... */);
    biasCorrection += (currentBias - fairShare); // adjusted weight if multiple criteria
  }

  // ... rest of scoring logic ...
}
```

### 5. Update checkEligibility.ts
File: `src/domain/scheduling/checkEligibility.ts`

Verify that eligibility checks do NOT reference bias criteria (should be orthogonal).

If bias affects eligibility, document clearly and ensure rules are preserved.

### 6. Update validateRoster.ts
File: `src/domain/scheduling/validateRoster.ts`

Add validation:
- Ensure all shifts have valid locationId references
- Ensure bias ledger only references active criteria IDs
- Warn if no bias criteria matched any shifts in month

### 7. Update generateShiftPool.ts
File: `src/domain/scheduling/generateShiftPool.ts`

Verify shifts are created with locationId populated.

If shifts don't have locations yet, assign a default or require location in input.

### 8. Update RosterSnapshot to Capture Criteria
File: `src/features/roster/services/rosterWorkflowService.ts`

Update `RosterMonthContext` to include:

```typescript
export interface RosterMonthContext {
  // ... existing fields ...
  activeBiasCriteria: ReadonlyArray<BiasCriteria>; // snapshot at generation time
  activeDutyLocations: ReadonlyArray<DutyLocation>; // snapshot at generation time
}
```

Update `RosterSnapshot.generatedInputSummary` to include:
```typescript
activeBiasCriteria: ReadonlyArray<BiasCriteria>;
activeDutyLocations: ReadonlyArray<DutyLocation>;
```

### 9. Export New Helpers
File: `src/domain/scheduling/index.ts`

Add exports:
```typescript
export { determineBiasCriteriaForShift } from "@/domain/scheduling/determineBiasCriteria";
```

## BACKWARD COMPATIBILITY

- Old BiasLedger records with `BiasBalance` should be migrated to `Record<EntityId, number>` format OR kept separate for history
- When loading past rosters, use stored snapshot criteria (not current admin-defined criteria)
- Do NOT retroactively recalculate bias for past rosters

## TESTING STRATEGY

Create unit tests (optional for agent, but recommended):

1. **determineBiasCriteriaForShift()**
   - Test location wildcard matching
   - Test shift type wildcard matching
   - Test weekday matching
   - Test weekend-only flag
   - Test all combinations

2. **fairnessState.ts updates**
   - Test initialization with dynamic criteria
   - Test bias increment per criteria
   - Test fair share calculation per criteria

3. **generateRoster() integration**
   - Test roster generation with 0 criteria → throws NoCriteriaDefinedError
   - Test roster generation with criteria
   - Test shift-to-criteria matching in generated roster

## VERIFICATION CHECKLIST

- [ ] determineBiasCriteria.ts implemented and exported
- [ ] fairnessState.ts updated for dynamic criteria
- [ ] generateRoster.ts updated to use dynamic criteria
- [ ] scoreCandidates.ts updated to score by multiple criteria
- [ ] checkEligibility.ts validated (no bias-dependent logic)
- [ ] validateRoster.ts validates location and criteria references
- [ ] Shift pool generation includes locationId
- [ ] RosterSnapshot captures active criteria/locations at generation time
- [ ] NoCriteriaDefinedError thrown when no criteria defined
- [ ] All imports and types correct
- [ ] No TypeScript errors
- [ ] Roster generation test with sample criteria works

## NOTES

- Ensure shift-to-criteria matching is deterministic (same shift always matches same criteria)
- Keep criteria evaluation pure (no side effects)
- Preserve existing scheduler logic where possible—only replace bias bucket references
- Document any changes to fairness scoring weights
