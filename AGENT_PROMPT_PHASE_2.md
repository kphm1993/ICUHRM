# AGENT IMPLEMENTATION: PHASE 2 — Admin Services & UI

## OBJECTIVE
Build admin services and UI pages to manage duty locations and bias criteria. Admins can visually create, edit, and combine bias tracking dimensions.

## DEPENDENCIES
- Phase 1 (models & repositories) must be complete

## DELIVERABLES

### 1. Create DutyLocationManagementService
File: `src/features/admin/services/dutyLocationManagementService.ts` (new file)

```typescript
import type { EntityId, DutyLocation } from "@/domain/models";
import type { DutyLocationRepository } from "@/domain/repositories";
import type { AuditLogService } from "@/features/audit/services/auditLogService";

export interface DutyLocationManagementService {
  createLocation(input: {
    code: string;
    label: string;
    description?: string;
    actorId: EntityId;
  }): Promise<DutyLocation>;

  updateLocation(input: {
    id: EntityId;
    changes: Partial<Omit<DutyLocation, 'id' | 'createdAt'>>;
    actorId: EntityId;
  }): Promise<DutyLocation>;

  deactivateLocation(input: {
    id: EntityId;
    actorId: EntityId;
  }): Promise<DutyLocation>;

  deleteLocation(input: {
    id: EntityId;
    actorId: EntityId;
  }): Promise<void>;

  getLocationList(): Promise<ReadonlyArray<DutyLocation>>;
}
```

Behaviors:
- Validate code is unique and alphanumeric
- Validate label is non-empty
- Log all mutations via AuditLogService
- Throw LocationInUseError if deleting a location referenced by active shifts
- Use DutyLocationRepository for persistence

### 2. Create BiasCriteriaManagementService
File: `src/features/admin/services/biasCriteriaManagementService.ts` (new file)

```typescript
import type { EntityId, BiasCriteria, DayOfWeek } from "@/domain/models";
import type { BiasCriteriaRepository, BiasLedgerRepository } from "@/domain/repositories";
import type { AuditLogService } from "@/features/audit/services/auditLogService";

export interface CreateBiasCriteriaInput {
  code: string;
  label: string;
  locationIds: ReadonlyArray<EntityId>; // can be empty
  shiftTypeIds: ReadonlyArray<EntityId>; // can be empty
  weekdayConditions: ReadonlyArray<DayOfWeek>; // can be empty
  isWeekendOnly: boolean;
  actorId: EntityId;
}

export interface BiasCriteriaManagementService {
  createCriteria(input: CreateBiasCriteriaInput): Promise<BiasCriteria>;

  updateCriteria(input: {
    id: EntityId;
    changes: Partial<CreateBiasCriteriaInput>;
    actorId: EntityId;
  }): Promise<BiasCriteria>;

  toggleCriteriaActive(input: {
    id: EntityId;
    isActive: boolean;
    actorId: EntityId;
  }): Promise<BiasCriteria>;

  deleteCriteria(input: {
    id: EntityId;
    actorId: EntityId;
  }): Promise<void>;

  getCriteriaList(): Promise<ReadonlyArray<BiasCriteria>>;

  getCriteriaLabel(id: EntityId): Promise<string | null>;
}
```

Behaviors:
- Validate code is unique and matches pattern `[A-Z0-9_]+`
- Validate label is non-empty
- Log all mutations via AuditLogService
- Throw CriteriaInUseError if deleting criteria referenced by past rosters
- Check BiasLedgerRepository to detect in-use criteria
- Use BiasCriteriaRepository for persistence

### 3. Create AdminLocationsPage Component
File: `src/features/admin/pages/AdminLocationsPage.tsx` (new file)

**Layout:**
- Header: "Duty Locations Manager"
- Button: "Create Location" (opens modal/form)
- Table with columns:
  - Code (left-aligned)
  - Label (left-aligned)
  - Description (left-aligned, optional)
  - Status (ACTIVE / INACTIVE badge)
  - Actions (Edit, Deactivate/Activate, Delete if safe)
- Empty state: "No duty locations created yet"

**Create/Edit Form Modal:**
- Input: Code (placeholder: "CCU", readonly on edit)
- Input: Label (placeholder: "Cardiac Care Unit")
- Textarea: Description (optional, placeholder: "Location notes")
- Toggle: Active/Inactive
- Buttons: Cancel, Save
- Validation feedback: code must be alphanumeric, label required

**Behaviors:**
- Load locations on mount
- Show error toast if create/update fails
- Show confirmation dialog before delete
- Disable delete button if location is in-use
- Refresh table after mutation

### 4. Create AdminBiasCriteriaPage Component
File: `src/features/admin/pages/AdminBiasCriteriaPage.tsx` (new file)

**Layout:**
- Header: "Bias Tracking Criteria Manager"
- Button: "Create Criteria" (opens builder modal)
- Table with columns:
  - Code (left-aligned)
  - Label (left-aligned)
  - Locations (comma-separated codes, or "All")
  - Shift Types (comma-separated codes, or "All")
  - Weekdays (MON–SUN display, or "All" or "Weekends")
  - Status (ACTIVE / INACTIVE badge)
  - Actions (Edit, Toggle Active, Delete if safe)
- Empty state: "No bias criteria created yet. Create one to enable bias tracking."

**Criteria Builder Modal (Visual Form):**

1. **Basic Info**
   - Input: Code (pattern: [A-Z0-9_]+, e.g., "CCU_MONDAY")
   - Input: Label (e.g., "CCU Monday Shifts")

2. **Location Selection** (Checkboxes)
   - [ ] Load locations from dutyLocationManagementService.getLocationList()
   - Render dynamic list of locations with checkboxes
   - Label: "Select Locations (leave empty for all)"
   - If none checked, show "Applies to all locations"

3. **Shift Type Selection** (Checkboxes)
   - [ ] Load shift types from service (Phase 2 or later)
   - Render dynamic list of shift types with checkboxes
   - Label: "Select Shift Types (leave empty for all)"
   - If none checked, show "Applies to all shift types"

4. **Weekday Selection** (Checkboxes)
   - [ ] MON, [ ] TUE, [ ] WED, [ ] THU, [ ] FRI, [ ] SAT, [ ] SUN
   - Label: "Select Days (leave empty for all days)"
   - Quick helper buttons: "Weekdays Only" (MON–FRI), "Weekends Only" (SAT–SUN), "All"

5. **Weekend Override Toggle**
   - Toggle: "Weekend only?" (disables if Sat/Sun not in weekday conditions)
   - Help text: "If enabled, criteria applies only on weekend days in the selected weekday list"

6. **Preview Section**
   - Live rendering showing criteria summary
   - Example: "Tracks shifts in CCU on Monday (all shift types, weekend mode off)"

7. **Buttons**
   - Cancel, Delete (if editing), Save

**Behaviors:**
- Load existing criteria/locations on mount
- Show validation errors inline
- Show preview updates as admin changes selections
- Show confirmation before delete
- Disable delete if criteria in-use
- Refresh table and notify on success
- Show error toast if mutation fails

### 5. Update Admin Routes
File: `src/app/router.tsx` (or wherever routing is)

Add routes:
```typescript
{
  path: '/admin/locations',
  element: <AdminLocationsPage />
},
{
  path: '/admin/bias-criteria',
  element: <AdminBiasCriteriaPage />
}
```

Update main admin nav to include links to both pages.

### 6. Update AdminSettingsPage Navigation
File: `src/features/admin/pages/AdminSettingsPage.tsx`

Add section with links to:
- Duty Locations Manager
- Bias Criteria Manager
- (Existing admin controls)

### 7. Integrate Services into AppServicesProvider
File: `src/app/providers/AppServicesProvider.tsx`

Add:
```typescript
dutyLocationManagementService: DutyLocationManagementService;
biasCriteriaManagementService: BiasCriteriaManagementService;
```

Instantiate both services with required dependencies (repositories, audit log).

### 8. Create useAppServices Hook Updates
File: `src/app/providers/useAppServices.ts`

Add type definitions for the two new services so they're accessible via hook.

## UI/UX REQUIREMENTS

- Mobile-first responsive layout
- Use Tailwind CSS and existing brand colors
- Toast notifications for errors/success
- Loading states while fetching
- Confirmation dialogs for destructive actions
- Form validation with clear error messages
- Accessible labels and ARIA attributes

## VALIDATION RULES

**Location Creation:**
- Code must be unique (alphanumeric, underscores, case-insensitive)
- Code must be 1–20 characters
- Label required, 1–100 characters
- Description optional, max 500 characters

**Criteria Creation:**
- Code must be unique, pattern `[A-Z0-9_]+`, 1–30 characters
- Label required, 1–100 characters
- At least one of locationIds, shiftTypeIds, or weekdayConditions can be empty (wildcard)
- Weekday list must not be empty if isWeekendOnly = true
- Cannot save if isWeekendOnly = true but no weekend days selected

## ERROR HANDLING

- LocationInUseError: Display toast "Cannot delete location—it is used by active shifts"
- CriteriaInUseError: Display toast "Cannot delete criteria—it is used by past rosters"
- Validation errors: Highlight form field, show inline error message
- Network/service errors: Show error toast with retry option

## VERIFICATION CHECKLIST

- [ ] DutyLocationManagementService implemented with full CRUD
- [ ] BiasCriteriaManagementService implemented with full CRUD
- [ ] AdminLocationsPage rendered and functional
- [ ] AdminBiasCriteriaPage with visual criteria builder
- [ ] Both pages linked from admin nav
- [ ] Services integrated into AppServicesProvider
- [ ] useAppServices hook exports both services
- [ ] Validation working as specified
- [ ] Error handling working
- [ ] Mobile layout tested
- [ ] No TypeScript errors
- [ ] Audit logging works for all mutations

## NOTES

- Do not implement scheduler integration yet (that's Phase 3)
- Focus on clean, intuitive admin UI
- Ensure mobile usability—buttons must be touch-friendly
- Preview section in criteria builder should update in real-time
