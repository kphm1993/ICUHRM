# Roster Wizard Implementation Prompts

## Overview

Implement a step-by-step roster generation wizard in admin mode.
The workflow is a full-page wizard under `Admin > Rosters` with the following behavior:
- 5 steps, with step navigation and persistent draft save
- auto-save when advancing steps
- drafts resumable across browser sessions by admin
- allow publish and unlock for later edits
- live bias-aware suggestions during manual shift assignment

## Requirements Summary

1. **Define roster period and holidays**
2. **Group constraints and exclusions**
3. **Duty designs mapping**
4. **Shift allocation and bias-aware assignment**
5. **Review + publish**

Note: step 2 from the earlier plan is removed. The wizard now has 5 steps.

## Clarified Rules

- Group constraints support both:
  - date-based application of doctor groups, and
  - doctor exclusion rules for specific periods
- Group constraints are reusable as templates
- Shift allocation step shows suggested doctors based on bias, but admin can override
- Overrides show a warning message when the selected doctor is less eligible
- Bias recalculates immediately after every assignment
- Published drafts become locked, but admins can unlock and edit later
- Bias tabs in shift assignment are driven by live criteria matching for the selected shift/day/location

---

# Prompt 1: Core Wizard Infrastructure

Implement the admin roster wizard infrastructure, step persistence, and draft resume behavior.

## 1. Add new wizard state model

### Domain/data model

Add a new entity in `src/domain/models`:

```ts
export interface RosterWizardDraft {
  readonly id: EntityId;
  readonly createdByActorId: EntityId;
  readonly createdAt: ISODateTimeString;
  readonly updatedAt: ISODateTimeString;
  readonly rosterMonth: YearMonthString;
  readonly customRange?: {
    readonly startDate: ISODateString;
    readonly endDate: ISODateString;
  };
  readonly publicHolidayDates: ReadonlyArray<ISODateString>;
  readonly groupConstraintTemplateIds: ReadonlyArray<EntityId>;
  readonly groupConstraints: ReadonlyArray<AssignedGroupConstraint>;
  readonly excludedDoctorPeriods: ReadonlyArray<DoctorExclusionPeriod>;
  readonly dutyDesignAssignments: ReadonlyArray<DutyDesignAssignment>;
  readonly manualShiftAssignments: ReadonlyArray<ManualShiftAssignment>;
  readonly currentBiasSnapshot: ReadonlyArray<BiasLedger>;
  readonly status: "DRAFT" | "PUBLISHED" | "LOCKED";
  readonly currentStep: 1 | 2 | 3 | 4 | 5;
}
```

Add supporting types:
- `AssignedGroupConstraint`
- `DoctorExclusionPeriod`
- `ManualShiftAssignment`

## 2. Repository and service

Add a draft repository and service:
- `RosterWizardDraftRepository`
- `RosterWizardService`

Methods:
- `createDraft()`
- `saveDraftStep()`
- `loadDraftById()`
- `listDraftsByAdmin()`
- `publishDraft()`
- `unlockDraft()`
- `deleteDraft()` if appropriate

Auto-save should persist data whenever the admin advances to the next step.

## 3. UI navigation

Add a new `Generate Roster` button in `Admin > Rosters`.
It opens a full-page modal wizard.

Wizard behavior:
- left or top stepper with 5 steps
- next/back buttons
- draft name and current step status visible
- saved drafts listed at top and selectable for resume
- draft progress persists across reloads and browser sessions

## 4. Step persistence

Every step must save the draft state before moving forward.
The wizard can resume from the last saved step.

## 5. Publish/unlock behavior

Published draft:
- status becomes `PUBLISHED`
- appears locked in the roster list
- admin can unlock and edit again

Locked draft:
- status becomes `LOCKED`
- remains editable by admin after unlocking

---

# Prompt 2: Step 1 - Date Range and Holidays

Implement step 1 of the roster wizard.

## Requirements

- Allow admin to select:
  - a full month by default, or
  - a custom start/end date range
- Provide a calendar UI to mark public holidays
- Selected holidays are saved to the draft
- Show summary of selected range and holiday count

## UI

Create a step page with:
- month selector + custom range toggle
- calendar grid showing selected dates
- click to mark/unmark a public holiday
- holiday list and clear button

## Validation

- start/end date required for custom range
- range must be valid and within same month or allowed span
- holiday dates must fall within selected range

---

# Prompt 3: Step 2 - Group Constraints and Exclusions

Implement step 2 of the roster wizard.

## Requirements

- Support reusable group constraint templates
- Support direct group constraint assignment per date
- Support doctor exclusion periods by date range
- Only doctors allowed by the selected constraints should appear in shift allocation

## Data model

Add templates:
- `GroupConstraintTemplate { id, code, label, rules }`
- `AssignedGroupConstraint { date, templateId }`
- `DoctorExclusionPeriod { doctorId, startDate, endDate, reason? }`

## UI

Create a UI step that allows:
- selecting an existing group constraint template
- applying it to one or more dates
- reviewing active date-to-template mapping
- excluding individual doctors for a date range with reason

## Behavior

- when group/exclusion data is saved, it influences step 4 doctor availability
- display a preview of impacted dates and excluded doctors

---

# Prompt 4: Step 3 - Duty Design Mapping

Implement step 3 of the roster wizard.

## Requirements

- Allow admin to assign a pre-made duty design to each date
- Support both standard and holiday override assignment
- Duty design assignments should be saved in the draft
- Show assignment status on the calendar

## UI

Create a step with:
- calendar or table view of dates
- select a date or date range and choose a `DutyDesign`
- toggle holiday override if the date is marked as holiday
- show the assigned design label on each date

## Behavior

- use existing duty designs from the admin store
- save selected assignments in the draft
- allow clearing or changing assignments before moving on

---

# Prompt 5: Step 4 - Manual Shift Allocation with Live Bias

Implement step 4 of the roster wizard.

## Requirements

- Display generated shifts for each date based on assigned duty designs
- Allow admin to click a shift and assign doctor(s)
- Provide live suggested doctor list sorted by bias
- Allow admin override with a warning
- Recompute bias immediately after each assignment

## UI

Create a shift allocation step with:
- calendar view or daily list of shifts
- list of shifts per day, displaying shift type and assigned doctors
- click a shift to open a modal
- modal contains vertical tabs for matching bias criteria
- tabs are generated dynamically from selected shift/day/location
- within each tab, doctors sorted from most negative bias to most positive
- show a top-message warning when selected doctor is less eligible

## Bias tab behavior

- show all matching criteria tabs for the selected shift
- criteria matching should be based on shift type, selected day, and location awareness
- if shift is Monday night, include:
  - Monday Night criteria
  - Monday any shift criteria
  - any day Night criteria
  - any shift criteria

## Behavior

- suggest doctors by bias score and eligibility
- allow manual assignment of any eligible doctor
- if assignment deviates from suggestion, display a non-blocking warning
- update the draft bias snapshot in real time

---

# Prompt 6: Step 5 - Review and Publish

Implement step 5 of the roster wizard.

## Requirements

- Display summary of:
  - shifts assigned per doctor
  - current bias for each doctor
  - holiday coverage and group constraint impact
- Allow admin to review and make changes before publishing
- Final publish saves the roster draft and marks it `PUBLISHED`

## UI

Create a review page with:
- doctor workload table
- bias summary table
- summary cards for total shifts, holidays, exclusions, and assignments
- edit buttons to return to any prior step
- publish button with confirmation

## Behavior

- support admin going back to any previous step and changing data
- save draft automatically when review page is reached
- publishing sets draft status to `PUBLISHED`
- later unlocking should be supported via roster workflow

---

# Prompt 7: Integration and Persistence

Implement draft resume, autosave, publish/unlock, and interaction with roster snapshot history.

## Requirements

- Save draft after each step advance
- Resume draft by admin account across sessions
- Show active drafts with current step at the top of roster admin page
- Published drafts become locked, but unlockable for admin edits
- Keep historical snapshots immutable once generated

## UI

- On `Admin > Rosters`, show a draft panel with:
  - draft name
  - current step
  - last updated timestamp
  - resume button
- If an admin opens a draft, the wizard should load the saved step and state

## Behavior

- unlocking `PUBLISHED` drafts changes status but preserves data
- locked draft can be unlocked and edited
- all draft state saved in backend storage and available across browser sessions

---

# Prompt 8: Tests and Validation

Add tests for the wizard and its workflow.

## Tests

- Draft creation and resume across steps
- Step navigation and auto-save behavior
- Holiday marking and custom range selection
- Group constraint assignment and exclusion periods
- Duty design mapping and holiday override
- Shift allocation modal and bias tabs
- Bias recalculation on assignment change
- Publish/unlock workflow
- Role-based admin access only

## Validation

- Ensure group constraints and exclusions affect shift eligibility
- Ensure duty design assignments persist in draft
- Ensure bias tabs are driven by live matching criteria
- Ensure published drafts are locked until unlocked

---

# Notes

- The wizard should be designed as a reusable admin workflow component.
- Use existing admin UI patterns and data models where possible.
- Keep step transitions smooth and make errors visible.
- Keep the prompt modular so implementation can be done in sequential phases.
