# Dynamic Bias Implementation

## Overview

The ICU HRM scheduler now uses admin-managed `BiasCriteria` and `DutyLocation`
records to drive primary fairness for new roster generations.

This document describes the current V1 behavior after Phases 1-4.

## Duty Locations

- Duty locations are managed in `Admin Tools > Duty Locations`.
- Generated `Shift` instances store `locationId` directly.
- Historical roster snapshots keep their own copied location context through
  `generatedInputSummary.activeDutyLocations`.
- Phase 3 currently supports exactly one active duty location during roster
  generation.

### Phase 3 Single-Location Rule

Roster generation fails unless there is exactly one active duty location.

This keeps V1 deterministic while location-aware fairness is in place and avoids
introducing partial multi-location logic before allocation rules exist.

## Bias Criteria

- Bias criteria are managed in `Admin Tools > Bias Criteria`.
- Active criteria are matched against each generated shift by:
  - location
  - shift type
  - weekday conditions
  - weekend-only flag
- Matching criteria drive:
  - candidate scoring
  - in-generation fairness tracking
  - carry-forward primary bias balances

## Criteria Matching Rules

A shift matches a criteria only when all configured filters match:

- `locationIds`: empty means all locations, otherwise the shift location must be included
- `shiftTypeIds`: empty means all shift types, otherwise the shift shift-type must be included
- `weekdayConditions`: empty means all days, otherwise the generated shift weekday must be included
- `isWeekendOnly`: when `true`, the shift must fall on Saturday or Sunday

If a generated shift matches no active criteria, roster generation still proceeds
but records a warning. If no generated shifts match any active criteria in the
month, the engine records an aggregate warning.

## Historical Immutability

Past rosters are never recalculated from current admin configuration.

Each new `RosterSnapshot` stores the exact criteria and location records used at
generation time in `generatedInputSummary`:

- `activeBiasCriteria`
- `activeDutyLocations`

This means:

- editing a criteria changes only future generations
- editing a duty location changes only future generations
- old snapshot warnings, validation, and `updatedBias` remain unchanged
- deletion is blocked when a criteria/location is still referenced by protected data

## Audit and Traceability

Roster workflow audit logs now include:

- roster month
- roster status
- warning count
- validation result
- derived-from roster id when applicable
- active criteria snapshot summary
- active duty location snapshot summary
- generation location id when a single active location is used

Location and criteria admin mutations also remain audit-logged, including
delete-blocked outcomes.

## Admin Troubleshooting

### "Cannot generate roster because no active bias criteria are defined."

Go to `Admin Tools > Bias Criteria`, create at least one active criteria record,
then generate again.

### "Roster generation currently supports exactly one active duty location."

Go to `Admin Tools > Duty Locations` and leave only one location active.

### "Cannot delete criteria ... because ..."

The criteria is still referenced by current primary bias ledgers or historical
roster snapshots. Deactivate it instead if you only want to stop future use.

### "Cannot delete location ... because ..."

The location is still system-required or referenced by protected historical
records. Keep the location, or stop using it only for future generations.

## Runtime Seed Behavior

The default runtime seed intentionally starts with:

- one default duty location
- zero active bias criteria

This keeps the admin setup explicit. Test/demo criteria should be created in
tests or examples rather than silently added to runtime seed data.
