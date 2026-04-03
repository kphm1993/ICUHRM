# AGENT IMPLEMENTATION: PHASE 4 — Integration & Validation

## OBJECTIVE
Complete integration of dynamic bias system, validate end-to-end, and ensure historical roster immutability. Finalize audit logging and error handling.

## DEPENDENCIES
- Phases 1, 2, and 3 must be complete

## DELIVERABLES

### 1. Complete Route Integration
File: `src/app/router.tsx`

Ensure the following admin routes are properly wired:
- `/admin/locations` → AdminLocationsPage
- `/admin/bias-criteria` → AdminBiasCriteriaPage
- Update admin nav menu to link these pages clearly

### 2. Audit Logging for All Mutations
File: `src/features/audit/services/auditLogService.ts` (update if needed)

Ensure AuditLogService logs the following actions at minimum:

```typescript
// Add if not already present
logBiasCriteriaCreated(input: {
  criteriaId: EntityId;
  code: string;
  label: string;
  actorId: EntityId;
}): Promise<void>;

logBiasCriteriaUpdated(input: {
  criteriaId: EntityId;
  changes: Record<string, any>;
  actorId: EntityId;
}): Promise<void>;

logBiasCriteriaDeleted(input: {
  criteriaId: EntityId;
  code: string;
  label: string;
  actorId: EntityId;
}): Promise<void>;

logDutyLocationCreated(input: {
  locationId: EntityId;
  code: string;
  label: string;
  actorId: EntityId;
}): Promise<void>;

logDutyLocationUpdated(input: {
  locationId: EntityId;
  changes: Record<string, any>;
  actorId: EntityId;
}): Promise<void>;

logDutyLocationDeleted(input: {
  locationId: EntityId;
  code: string;
  label: string;
  actorId: EntityId;
}): Promise<void>;

logRosterGeneratedWithCriteria(input: {
  rosterId: EntityId;
  activeCriteria: ReadonlyArray<BiasCriteria>;
  actorId: EntityId;
}): Promise<void>;
```

Call these from:
- `dutyLocationManagementService.ts` (create, update, delete)
- `biasCriteriaManagementService.ts` (create, update, delete)
- `rosterWorkflowService.ts` (generate)

### 3. Update RosterWorkflowService
File: `src/features/roster/services/rosterWorkflowService.ts`

a) Update `generateRoster()` method to:
   - Load active bias criteria via `biasCriteriaRepository.listActive()`
   - Load active duty locations via `dutyLocationRepository.listActive()`
   - Validate at least one criteria exists (throw NoCriteriaDefinedError if not)
   - Pass criteria/locations to domain `generateRoster()` function
   - Log generation with criteria via audit service

b) Update `getMonthContext()` to include:
   ```typescript
   activeBiasCriteria: BiasCriteria[];
   activeDutyLocations: DutyLocation[];
   ```

c) Ensure `RosterSnapshot` stores:
   ```typescript
   generatedInputSummary: {
     // ... existing fields ...
     activeBiasCriteria: ReadonlyArray<BiasCriteria>;
     activeDutyLocations: ReadonlyArray<DutyLocation>;
   }
   ```

### 4. Update Shift Type Management
File: `src/features/shifts/services/shiftTypeManagementService.ts` (if exists, or create if needed)

Update to ensure shifts created via admin include locationId.

If shift creation UI exists, update forms to require location selection.

### 5. Update UI: Roster Display
File: `src/features/roster/components/RosterCalendar.tsx` (or relevant display component)

Optionally display location information on shifts if desired (not required, but helpful for full transparency).

### 6. Error Handling & User Feedback
File: Create or update error boundary and toast notifications

a) Catch and handle specific errors:

```typescript
import { 
  NoCriteriaDefinedError,
  CriteriaInUseError,
  LocationInUseError
} from "@/domain/repositories/errors";

// In roster generation UI
try {
  await rosterWorkflowService.generateRoster();
} catch (error) {
  if (error instanceof NoCriteriaDefinedError) {
    showErrorToast(
      "Cannot generate roster: No bias criteria defined. " +
      "Please create at least one bias criteria in Admin > Bias Criteria."
    );
  } else if (error instanceof LocationInUseError) {
    showErrorToast("Cannot delete location: It is referenced by active shifts.");
  } else if (error instanceof CriteriaInUseError) {
    showErrorToast("Cannot delete criteria: It is referenced by past rosters.");
  } else {
    showErrorToast("Roster generation failed: " + error.message);
  }
}
```

b) Update location/criteria deletion confirmations to warn about consequences.

### 7. Data Seeding
File: `src/app/seed/rosterSeedData.ts` (update if needed)

Add sample data for testing:

```typescript
// Add these to seed data
const SAMPLE_LOCATIONS: DutyLocation[] = [
  {
    id: 'loc_1' as EntityId,
    code: 'CCU',
    label: 'Cardiac Care Unit',
    isActive: true,
    createdAt: new Date().toISOString() as ISODateTimeString,
    updatedAt: new Date().toISOString() as ISODateTimeString
  },
  {
    id: 'loc_2' as EntityId,
    code: 'ICCU',
    label: 'Intensive Care Unit',
    isActive: true,
    createdAt: new Date().toISOString() as ISODateTimeString,
    updatedAt: new Date().toISOString() as ISODateTimeString
  }
];

const SAMPLE_CRITERIA: BiasCriteria[] = [
  {
    id: 'crit_1' as EntityId,
    code: 'CCU_MONDAY',
    label: 'CCU Monday Shifts',
    locationIds: ['loc_1'],
    shiftTypeIds: [],
    weekdayConditions: ['MON'],
    isWeekendOnly: false,
    isActive: true,
    createdAt: new Date().toISOString() as ISODateTimeString,
    updatedAt: new Date().toISOString() as ISODateTimeString,
    createdByActorId: ADMIN_USER_ID,
    updatedByActorId: ADMIN_USER_ID
  },
  // ... more sample criteria
];

// Seed repositories with this data on first init
```

### 8. Validate Historical Immutability
File: None (documentation & verification)

**Verification Plan:**

1. Create a roster snapshot in an old month (e.g., January 2026)
2. In admin, create new locations and criteria
3. Verify:
   - Old roster's `generatedInputSummary.activeBiasCriteria` is unchanged
   - Old roster's bias ledger is unchanged
   - New roster (if generated) uses new criteria
4. Test deletion:
   - Attempt to delete a criteria or location used by old roster
   - Verify error thrown and deletion blocked

### 9. Documentation Update
File: Create `DYNAMIC_BIAS_IMPLEMENTATION.md` (optional but recommended)

Document:
- How to create and manage locations
- How to create bias criteria with examples
- How criteria matching works
- How past rosters are protected
- Troubleshooting: "Cannot generate roster—No criteria defined"

### 10. Type Exports Update
File: `src/domain/models/index.ts`

Ensure all new types are exported:
```typescript
export type { DutyLocation } from "@/domain/models/DutyLocation";
export type { BiasCriteria } from "@/domain/models/BiasCriteria";
export type { DayOfWeek } from "@/domain/models/primitives";
```

File: `src/domain/repositories/index.ts`

Ensure all new repositories are exported:
```typescript
export type { DutyLocationRepository } from "@/domain/repositories/DutyLocationRepository";
export type { BiasCriteriaRepository } from "@/domain/repositories/BiasCriteriaRepository";
```

## END-TO-END SCENARIO TEST

Manual verification (not automated, but important):

**Scenario: Admin creates new bias criteria and generates roster**

1. Admin logs in
2. Admin navigates to Admin > Duty Locations
   - Creates location "CCU"
   - Creates location "ICCU"
3. Admin navigates to Admin > Bias Criteria
   - Creates criteria: code="CCU_ALL", label="All CCU Shifts", locations=[CCU], days=[], isActive=true
   - Creates criteria: code="MONDAY_NIGHT", label="Monday Night (All Locations)", days=[MON], shiftTypes=[], isActive=true
4. Admin generates roster for current month
   - System should:
     - Load 2 active criteria ✓
     - Load 2 active locations ✓
     - Match shifts to criteria deterministically ✓
     - Compute fairness per criteria ✓
     - Create bias ledger with balances keyed by criteria IDs ✓
     - Log roster generation with criteria snapshot ✓
5. Admin views roster
   - Roster displays shifts with locations (if UI updated)
   - Doctor fairness summary shows bias per criteria (optional UI enhancement)
6. Admin deactivates one criteria
   - Next roster generation uses only the remaining active criteria
7. Admin attempts to delete "CCU" location
   - System blocks deletion with message: "Location is referenced by shifts"
8. Admin attempts to delete "CCU_ALL" criteria
   - If no past rosters use it, deletion succeeds
   - If past rosters use it, system blocks with: "Criteria is referenced by past rosters"

## VERIFICATION CHECKLIST

- [ ] Routes for admin pages working
- [ ] Audit logging complete for all location/criteria mutations
- [ ] Audit logging for roster generation with criteria
- [ ] RosterWorkflowService.generateRoster() loads and validates criteria
- [ ] RosterSnapshot captures criteria/location snapshots
- [ ] Shift model and creation includes locationId
- [ ] Error handling for NoCriteriaDefinedError, LocationInUseError, CriteriaInUseError
- [ ] User-friendly toast messages for all error conditions
- [ ] Seed data includes sample locations and criteria
- [ ] Historical rosters are immutable (old snapshots unchanged)
- [ ] Deletion blocking works (location in-use, criteria in-use)
- [ ] All TypeScript types correct and exported
- [ ] No TypeScript errors in codebase
- [ ] End-to-end scenario test passes manually
- [ ] Mobile UI remains responsive

## NEXT STEPS (After V1 Complete)

Future enhancements (not Phase 1):
- Bias visualization per criteria in doctor dashboard
- Fairness export/reporting by criteria
- Scheduler auto-suggestions based on criteria imbalance
- Criteria templates (pre-built common patterns)
- Bulk criteria creation wizard

## NOTES

- Ensure all datetime fields use ISO 8601 format
- Use EntityId type consistently for all IDs
- Preserve audit trail—never delete old audit logs
- Consider soft-delete for criteria/locations (mark isActive=false instead of hard delete)
- Test on mobile device or emulator to verify touch interactions
