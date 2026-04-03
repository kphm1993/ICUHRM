# SYSTEM_ARCHITECTURE.md

---

## 1. PURPOSE

This document defines the system architecture for the **CCU/ICU Roster System V1**.

It explains:

- major modules
- data ownership
- scheduling engine flow
- fairness and bias handling
- admin controls
- user actions
- backend and frontend boundaries

This architecture is designed to be:

- simple enough for V1
- safe for real hospital roster workflows
- extensible for future modules such as patient handover

---

## 2. HIGH-LEVEL ARCHITECTURE

The system should be built as a **single web application** with clear internal separation between:

1. **Presentation Layer**
2. **Application Layer**
3. **Domain / Scheduling Engine Layer**
4. **Persistence Layer**
5. **Audit Layer**

---

## 3. ARCHITECTURE OVERVIEW

```text
[ Client UI ]
    |
    v
[ Frontend App ]
    |
    v
[ API / Application Services ]
    |
    +------------------------------+
    |                              |
    v                              v
[ Scheduling Engine ]        [ Admin / Request Services ]
    |                              |
    +---------------+--------------+
                    |
                    v
             [ Database Layer ]
                    |
                    v
               [ Audit Logger ]

```

## 4. TECHNOLOGY DIRECTION (V1)
Frontend
React
TypeScript
Tailwind CSS
Mobile-first responsive layout
Backend

Choose one of the following:

Option A — Recommended for simplicity
Firebase / Firestore
Firebase Auth
Cloud Functions (for roster generation, validation, audit-safe actions)
Option B — More structured backend
Node.js
Express
TypeScript
REST API
Persistence
Firestore or relational DB
V1 should keep schema clean enough for later migration

## 5. CORE SYSTEM MODULES

The system should be divided into the following modules:

### 5.1 Authentication Module

Handles:

login
session identity
role lookup

Roles:

ADMIN
DOCTOR

### 5.2 Doctor Management Module

Handles:

doctor creation
doctor deletion
phone number
unique ID
weekend group
account status

Admin only.

### 5.3 Shift Configuration Module

Handles:

duty types
duty start/end times
active shift templates

Admin only.

This module defines the shape of future roster generation.

Past rosters must remain unchanged after configuration edits.

### 5.4 Leave Management Module

Handles:

leave creation
leave edit/delete
leave overlap validation
exclusion from shift eligibility

Admin only in V1.

### 5.5 Off-Day Request Module

Handles:

request submission
request priority
request time window validation
request locking after cutoff

Doctor and admin accessible.

### 5.6 Roster Generation Module

Handles:

shift pool creation
doctor eligibility filtering
fairness scoring
bias-aware assignment
final validation
roster publish/lock

Admin only.

This is the core business engine of the product.

### 5.7 Exchange Module

Handles:

exchange request creation
acceptance / rejection
reassignment of actual performer
preservation of fairness ownership

Doctor and admin accessible.

### 5.8 Bias Ledger Module

Handles:

carry-forward fairness values
per-doctor bias totals
manual adjustment
full reset
individual reset

Admin visible and controllable.

Doctors can only view relevant outputs.

### 5.9 Audit Log Module

Handles:

append-only logging of critical events
action traceability
admin override history
bias edits
exchange decisions
roster generation record

Must be immutable in normal UI flow.

## 6. DOMAIN MODEL OVERVIEW

The architecture should separate configuration data, planning data, operational data, and historical data.

### 6.1 Configuration Data

These define the rules/environment:

doctors
weekend groups
shift types
lock window settings

### 6.2 Planning Data

These influence a new roster:

off-day requests
leave records
current bias ledger
roster date range

### 6.3 Operational Data

These represent current working reality:

generated shifts
assignments
exchange requests
actual performer changes

### 6.4 Historical Data

These must remain stable:

past rosters
past assignments
audit logs
previous bias snapshots

## 7. DATA FLOW — ROSTER GENERATION

### 7.1 Input Sources

The generator reads from:

doctors
active doctor status
weekend group assignments
leave records
off-day requests
shift type definitions
active duty locations
active bias criteria
prior bias ledger
roster date range

### 7.2 Generation Flow

1. Load active doctors
2. Load shift configuration
3. Generate shift pool for selected date range
4. Mark each shift as:
   - WEEKDAY / WEEKEND
   - DAY / NIGHT / CUSTOM
   - FRIDAY_NIGHT special if applicable
5. Load leave records
6. Load off-day requests
7. Load current bias ledger
8. Compute eligible doctor list per shift
9. Score candidates
10. Assign best candidate
11. Update in-memory fairness state
12. Validate final roster
13. Save roster + assignments
14. Save updated bias ledger
15. Write audit log

## 8. SCHEDULING ENGINE DESIGN

The scheduling engine should be treated as a pure domain service as much as possible.

It should not directly manage UI state.

It should accept structured input and return structured output.

### 8.1 Engine Input Contract

type GenerateRosterInput = {
  range: {
    startDate: string
    endDate: string
  }
  doctors: Doctor[]
  shiftTypes: ShiftType[]
  leaves: Leave[]
  offRequests: OffRequest[]
  currentBias: BiasLedger[]
  activeBiasCriteria: BiasCriteria[]
  activeDutyLocations: DutyLocation[]
  generationLocationId: string
  weekendGroupSchedule: WeekendGroupSchedule
}

### 8.2 Engine Output Contract

type GenerateRosterOutput = {
  shifts: Shift[]
  assignments: Assignment[]
  updatedBias: BiasLedger[]
  validation: ValidationResult
  warnings: string[]
}

## 9. SHIFT CLASSIFICATION MODEL

Every generated shift must be classified so business rules remain deterministic.

Required classifications
- type: DAY | NIGHT | CUSTOM
- category: WEEKDAY | WEEKEND
- special: NONE | FRIDAY_NIGHT
- groupEligibility: ALL | WEEKEND_GROUP_A | WEEKEND_GROUP_B | NOT_WEEKEND_OFF_GROUP

### Notes

- Weekend begins with Saturday day shift
- Weekend ends after Sunday night shift
- Friday night is not weekend for fairness counting
- Friday night still depends on weekend-group eligibility restriction

## 10. ASSIGNMENT OWNERSHIP MODEL

To prevent exchange conflicts, each assignment must track three roles.

type Assignment = {
  id: string
  shiftId: string
  assignedDoctorId: string
  actualDoctorId: string
  fairnessOwnerDoctorId: string
  source: 'AUTO' | 'ADMIN_OVERRIDE'
}

### Rules
- assignedDoctorId = original scheduled owner
- actualDoctorId = who will physically work
- fairnessOwnerDoctorId = who receives balance credit/debit

### Default

At creation:

- assignedDoctorId = actualDoctorId = fairnessOwnerDoctorId

### After exchange

- only actualDoctorId changes

### After admin override

V1 decision:

- admin override changes all three by default unless explicitly marked as a temporary operational override. 

This should be implemented carefully and logged.

## 11. FAIRNESS AND BIAS ARCHITECTURE

### 11.1 Why Bias Exists

Perfect equality cannot always be achieved in a single month because of:

- leave
- weekend grouping
- off requests
- month length
- uneven shift counts

Bias is the carry-forward correction mechanism.

---

### 11.2 Bias Dimensions

Primary bias is now tracked by admin-defined `BiasCriteria` records rather than
hardcoded weekday/weekend buckets.

Each criteria may match shifts by:

- duty location
- shift type
- weekday conditions
- weekend-only restriction

This allows V1 fairness dimensions such as:

- all CCU shifts
- all night shifts
- Monday night shifts
- weekend-only shifts

Historical weekday-pair ledgers may still exist on old snapshots for backward
compatibility, but new roster generations use criteria-based primary bias.

### 11.3 Bias Ledger Shape

```
type BiasLedger = {
  doctorId: string
  effectiveMonth: string
  balances: Record<string, number>
  updatedAt: string
}
```
### Interpretation

- positive = doctor has done more than fair share
- negative = doctor has done less than fair share

Generation should prefer correcting negative bias first.

### 11.4 Historical Safety

New roster snapshots must store the exact active criteria and duty-location
records used at generation time.

Later admin edits must affect only future generations and must not rewrite the
meaning of past roster snapshots or their bias outputs.

## 12. ELIGIBILITY ENGINE

Before candidate scoring, each shift must produce an eligible doctor set.

### Exclusion rules

A doctor is excluded if:

- inactive
- on leave
- blocked by weekend group rule
- blocked by Friday night rule
- blocked by locked manual admin setting if future support added

### V1 note

Do not add too many hidden eligibility rules. Keep it explicit.

---

## 13. CANDIDATE SCORING MODEL

The generator should assign a score per eligible doctor for each shift.

Lower score should mean better candidate.

Example structure:

```
score =
  biasCorrectionWeight
+ fairnessLoadWeight
+ shiftTypeBalanceWeight
+ requestConflictPenalty
+ overusePenalty
```

### Suggested meaning

- doctors with under-assignment get a better score
- doctors with matching off requests get a worse score
- doctors already overloaded in that category get a worse score

### Important

Do not hardcode too many magical weights across UI and backend.  
Keep them centralized in one engine config file.

---

## 14. REQUEST WINDOW ARCHITECTURE

The request window must be enforced by a dedicated rules service.

### V1 rule

For month M:

- requests open on 20th of month M-1
- requests close on 26th of month M-1 at 23:59
- roster becomes locked after this cutoff once generated/published

### Validation service responsibilities

- reject late requests
- reject weekend off requests
- reject invalid priority values
- reject duplicate conflicting requests

---

## 15. ROSTER STATUS MODEL

The roster should have lifecycle states.

```
type RosterStatus =  
  | 'DRAFT'  
  | 'GENERATED'  
  | 'PUBLISHED'  
  | 'LOCKED'
```

### Meaning

- `DRAFT`: editable by admin
- `GENERATED`: created by engine but not yet finalized
- `PUBLISHED`: visible as official roster
- `LOCKED`: no user request editing; only exchanges and admin overrides allowed

### V1 recommendation

Use:

- DRAFT
- PUBLISHED
- LOCKED

Keep lifecycle simple.

## 16. MUTUAL EXCHANGE ARCHITECTURE

### Exchange flow

```
1. Doctor selects owned shift  
2. Doctor chooses target doctor  
3. Exchange request created as PENDING  
4. Target doctor accepts or rejects  
5. If accepted:  
   - actualDoctorId is changed  
   - fairnessOwnerDoctorId remains original  
1. Audit log entry written
```

### Exchange entity

```
type ExchangeRequest = {  
  id: string  
  shiftId: string  
  requestedByDoctorId: string  
  requestedToDoctorId: string  
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'CANCELLED'  
  note?: string  
  createdAt: string  
  respondedAt?: string  
}
```

### Admin permissions

- cancel pending exchange
- view all exchange history

## 17. ADMIN OVERRIDE ARCHITECTURE

Admin must be able to perform operational corrections.

### Allowed override actions

- reassign shift
- change shift type
- change shift time for future generation setup
- modify weekend group
- modify bias
- reset bias

### Important separation

There are two types of admin changes:

#### A. Configuration changes

Affect future generations only

- shift types
- shift times
- group setup

#### B. Operational changes

Affect active roster records

- reassign shift
- cancel request
- emergency changes

Every override must:

- require explicit action
- store actor identity
- create audit entry

## 18. SHIFT CONFIGURATION ARCHITECTURE

Shift types must be configurable entities, not hardcoded constants.

```
type ShiftType = {  
  id: string  
  code: string  
  label: string  
  startTime: string  
  endTime: string  
  defaultCategoryHint?: 'DAY' | 'NIGHT' | 'CUSTOM'  
  isActive: boolean  
}
```

### Design rule

A roster stores resolved shift instances.  
So even if a shift type changes later, old roster shifts remain unchanged.

This prevents historical corruption.

---

## 19. FRONTEND ARCHITECTURE

Frontend should be modular and role-aware.

### Suggested top-level feature folders

```
src/  
  app/  
  components/  
  features/  
    auth/  
    doctors/  
    shifts/  
    leaves/  
    offRequests/  
    roster/  
    exchanges/  
    fairness/  
    audit/  
    admin/  
  domain/  
  lib/  
  types/
```

---

### 19.1 Frontend Feature Responsibilities

#### auth

- login form
- session provider
- route guards

#### doctors

- doctor list
- create/edit form
- group assignment UI

#### shifts

- shift type settings
- shift time editor

#### leaves

- leave entry
- leave calendar blocks

#### offRequests

- submit request
- list own requests
- admin review list

#### roster

- calendar view
- assignment rendering
- publish/lock controls

#### exchanges

- request exchange
- accept/reject interface

#### fairness

- doctor balance dashboard
- bias summary cards/tables

#### audit

- log viewer
- action filters

#### admin

- settings
- bias reset controls
- override tools

## 20. BACKEND / SERVICE ARCHITECTURE

Even in a small V1, backend code should be separated into:

```
server/  
  routes/  
  controllers/  
  services/  
  domain/  
    scheduling/  
    fairness/  
    validation/  
  repositories/  
  audit/  
  types/
```

### Responsibility split

#### routes/controllers

- HTTP boundary only

#### services

- orchestrate use cases

#### domain/scheduling

- pure scheduling logic

#### repositories

- database read/write

#### audit

- append audit events

This separation will make Codex changes safer.

---

## 21. DATABASE / STORAGE DESIGN PRINCIPLES

### Principles

- do not overwrite history
- keep generated roster snapshots
- keep bias separate from roster records
- keep exchanges separate from assignments
- keep audit append-only

### Main collections / tables

- doctors
- shiftTypes
- leaves
- offRequests
- rosters
- shifts
- assignments
- exchangeRequests
- biasLedger
- auditLogs

## 22. AUDIT ARCHITECTURE

Audit logging is not optional.

### Audit events should include

- actor id
- actor role
- action type
- target entity type
- target entity id
- timestamp
- before/after summary when relevant

Example:

```
type AuditLog = {  
  id: string  
  actorId: string  
  actorRole: 'ADMIN' | 'DOCTOR' | 'SYSTEM'  
  actionType: string  
  entityType: string  
  entityId: string  
  details: Record<string, unknown>  
  createdAt: string  
}
```

### System-generated actions

Roster generation should use:

- `actorRole = SYSTEM`
- `actorId = system`

---

## 23. SECURITY AND ACCESS CONTROL

### Doctor permissions

Doctors can:

- log in
- view roster
- view fairness summaries
- create off requests
- view own requests
- request exchanges
- accept/reject exchange requests directed to them

Doctors cannot:

- create/delete doctors
- change leave
- reset bias
- modify shift configuration
- generate/publish roster
- manually edit others' assignments

---

### Admin permissions

Admin can:

- do everything doctors can do
- manage doctors
- manage leave
- manage groups
- generate/publish roster
- edit shift configuration
- change duty types/times
- adjust/reset bias
- override assignments
- cancel/remove requests
- view full audit logs

---

## 24. ERROR HANDLING STRATEGY

The system should return structured errors.

### Example categories

- `AUTH_ERROR`
- `VALIDATION_ERROR`
- `RULE_VIOLATION`
- `LOCKED_ROSTER_ERROR`
- `NOT_FOUND`
- `CONFLICT`

### UI behavior

- show clear human-readable message
- preserve form state when possible
- show exact violated rule for admin operations

---

## 25. V1 NON-GOALS

These should not be added in V1 core engine:

- patient handover workflows
- multi-hospital support
- advanced AI optimization
- day-of-week pair fairness balancing
- auto-SMS / WhatsApp notification system
- payroll integration
- multi-step complex duty templates beyond basic custom shifts

Keep V1 stable and debuggable.

---

## 26. EXTENSIBILITY PLAN

The architecture should later support:

### Phase 2 candidates

- day-of-week fairness balancing
- notification system
- richer reporting
- partial leave / half-day leave
- recurring leave rules
- stronger emergency override modes

### Phase 3 candidates

- patient handover module
- ICU census linkage
- unit-specific staffing rules
- analytics dashboard

---

## 27. RECOMMENDED IMPLEMENTATION ORDER

1. authentication + roles
2. doctor management
3. shift configuration
4. leave management
5. bias ledger setup
6. roster data model
7. scheduling engine
8. roster calendar UI
9. off-day request module
10. exchange module
11. admin override tools
12. audit viewer

This order reduces integration risk.

---

## 28. KEY ARCHITECTURAL DECISIONS

### Decision 1

Fairness is availability-adjusted, not absolute.

### Decision 2

Primary fairness is tracked by admin-defined criteria, while weekend rules remain
explicit operational constraints.

### Decision 3

Exchanges change actual performer, not fairness ownership.

### Decision 4

Shift types and shift times are configurable entities.

### Decision 5

Bias can be reset or manually adjusted by admin, but all such actions must be logged.

### Decision 6

Past roster records are immutable historical snapshots.

---

## 29. MINIMUM REQUIRED TYPES

The following domain types must exist in code:

- `User`
- `Doctor`
- `ShiftType`
- `Shift`
- `Roster`
- `Assignment`
- `Leave`
- `OffRequest`
- `ExchangeRequest`
- `BiasLedger`
- `AuditLog`

---

## 30. FINAL V1 ARCHITECTURE SUMMARY

The system is a fairness-first roster platform with:

- configurable duty definitions
- structured scheduling engine
- separate fairness ledger
- clear ownership model for exchanges
- strict admin controls
- full auditability
- mobile-first roster visibility

The architecture intentionally separates:

- planning
- assignment
- fairness accounting
- operational changes
- historical records

This separation is the key to making the roster system correct, explainable, and maintainable.
