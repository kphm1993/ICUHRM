# PRODUCT SPEC — CCU/ICU Roster System (V1)

---

## 1. PRODUCT OVERVIEW

### Purpose
A healthcare-grade roster management system for CCU/ICU that:

- Ensures fair shift distribution
- Supports off-day preferences
- Handles leave and availability
- Enables shift exchange
- Maintains long-term fairness via bias tracking

---

## 2. CORE DESIGN PRINCIPLES

### 2.1 Fairness Model

Fairness is calculated relative to availability:

fairness_ratio = assigned_shifts / eligible_shifts

Tracked by **admin-defined bias criteria** (see section 5.1 below).

Admins can create custom fairness dimensions by combining:
- Duty locations (e.g., CCU, ICCU)
- Shift types (e.g., DAY, NIGHT)
- Individual weekdays (MON, TUE, WED, THU, FRI, SAT, SUN)
- Weekends (combining SAT/SUN)

Example: "CCU Monday Night" tracks only shifts in CCU on Mondays with night type.

---

### 2.2 Constraint Hierarchy

#### HARD CONSTRAINTS (Never violated)
- No assignment during leave
- One doctor per shift
- One shift per day per doctor (no day+night on same date)
- Rest after night shift (no shift day following a night shift)
- Weekend-off group cannot work weekend shifts
- Friday night cannot be assigned to weekend-off group
- No off-day requests allowed for weekends
- Locked roster cannot be edited by users

#### SOFT CONSTRAINTS
- Equal shift distribution
- Off-day preferences
- Equal day/night balance

---

## 3. SHIFT SYSTEM

### 3.1 Shift Definition

Shift {
  id
  date
  location_id (reference to DutyLocation)
  start_time
  end_time
  type: DAY | NIGHT | CUSTOM
  category: WEEKDAY | WEEKEND
  special: NONE | FRIDAY_NIGHT
}

---

### 3.2 DEFAULT CONFIGURATION

- Day: 08:00–20:00
- Night: 20:00–08:00

---

### 3.3 ADMIN-CONTROLLED SHIFT CONFIGURATION

Admin can:

- Modify shift times globally
- Add new shift types (e.g., SHORT_CALL, ICU_ONCALL)
- Edit existing shift types
- Delete shift types (if unused)

### 3.4 ADMIN-CONTROLLED DUTY LOCATIONS (NEW)

Admin can:

- Create new duty locations (e.g., CCU, ICCU, Surgical ICU)
- Edit location name and description
- Deactivate or delete locations (if no shifts reference them)

Example:

DutyLocation {
  code: "CCU"
  label: "Cardiac Care Unit"
  description: "High-acuity cardiac patients"
}

---

## 4. OWNERSHIP MODEL (CRITICAL)

Each shift has:

Assignment {
  shift_id
  assigned_doctor_id
  actual_doctor_id
  fairness_owner_id
}

Rules:
- fairness_owner_id = assigned_doctor_id
- Exchange only changes actual_doctor_id
- Bias calculation uses fairness_owner_id

---

## 5. BIAS SYSTEM (DYNAMIC)

### 5.1 Bias Criteria (NEW)

Instead of hardcoded fairness buckets, admins define custom tracking criteria.

BiasCriteria {
  id (unique identifier)
  code (unique string, e.g., "CCU_MONDAY_NIGHT")
  label (human-readable, e.g., "CCU Monday Night Shifts")
  locationIds [] (empty = all locations)
  shiftTypeIds [] (empty = all shift types)
  weekdayConditions [] (empty = all days; can specify MON, TUE, WED, THU, FRI, SAT, SUN)
  isWeekendOnly (boolean; if true, applies only to weekend days)
  isActive (boolean)
}

A shift matches a criteria if ALL of:
- shift location is in locationIds (or locationIds is empty)
- shift type is in shiftTypeIds (or shiftTypeIds is empty)
- shift day is in weekdayConditions (or weekdayConditions is empty)
- if isWeekendOnly=true, shift must be on Saturday or Sunday

Example criteria:
- code="CCU_ALL", label="All CCU Shifts", locationIds=[CCU], weekdayConditions=[], shiftTypeIds=[] → matches all shifts in CCU
- code="MONDAY_NIGHT", label="Monday Night (All Locations)", locationIds=[], weekdayConditions=[MON], shiftTypeIds=[NIGHT] → matches night shifts on Mondays
- code="WEEKEND", label="All Weekend Shifts", locationIds=[], weekdayConditions=[SAT,SUN], shiftTypeIds=[] → matches all weekend shifts

### 5.2 Bias Ledger

BiasLedger {
  doctor_id
  effective_month
  balances: {
    [criteria_id]: numeric_bias_value,
    [criteria_id_2]: numeric_bias_value,
    ...
  }
}

Each doctor has a bias balance for each active criteria (not hardcoded buckets).

### 5.3 Bias Interpretation

- Positive = over-assigned (doctor has done more shifts in this criteria)
- Negative = under-assigned (doctor has done fewer shifts in this criteria)
- Used in next month roster generation to rebalance
- Bias is accrued per criteria independently

### 5.4 ADMIN BIAS CRITERIA MANAGEMENT (NEW)

Admin can:

#### A. Create Bias Criteria
- Define custom tracking dimension
- Configure location, shift type, and day conditions
- Activate immediately or later

#### B. Edit Criteria
- Modify label, location/shift/day conditions
- Only affects future rosters (past rosters unaffected)

#### C. Deactivate/Delete Criteria
- Deactivate: criteria no longer tracked in future rosters, but past data preserved
- Delete: only allowed if no past rosters reference it

#### D. Reset All Bias (Existing)
- Set all doctors' bias to zero across all criteria

#### E. Reset Individual Doctor Bias (Existing)
- Reset selected doctor's bias across all criteria

#### F. Manual Bias Adjustment (Existing)
- Add or subtract bias manually per doctor, per criteria

IMPORTANT:
- App initializes with **zero criteria defined**
- Admin must create at least one criteria before roster generation
- All criteria mutations are audit-logged

---

## 6. DOCTOR MANAGEMENT

Admin only:
- Create doctor
- Assign:
  - name
  - phone
  - unique_id
  - password
- Assign weekend group (A/B)
- Delete doctor

---

## 7. LEAVE SYSTEM

Leave {
  doctor_id
  start_date
  end_date
}

Rules:
- Excluded from all assignments
- Reduces eligible shifts
- Does NOT create bias

---

## 8. OFF-DAY REQUEST SYSTEM

### Window
- Opens: 20th of previous month
- Closes: 26th (23:59)
- Roster locks after closing

---

### Structure

OffRequest {
  doctor_id
  date
  shift_type: DAY | NIGHT | FULL_DAY
  priority (1–5)
  timestamp
}

---

### Resolution Priority

1. Hard constraints
2. Fairness impact
3. User priority
4. Timestamp
5. Doctor ID

---

### Restrictions
- Weekend dates disabled

---

## 9. ROSTER GENERATION ENGINE

### Inputs
- Doctors
- Leaves
- Off requests
- Bias ledger (with balances keyed by active criteria)
- Shift definitions
- Duty locations reference
- Active bias criteria (admin-defined)

---

### Algorithm

#### Phase 1 — Generate Shifts

Create all shifts based on:
- Date range
- Shift configuration

---

#### Phase 2 — Filter Eligible Doctors

Remove:
- On leave
- Violating weekend group
- Violating Friday rule

---

#### Phase 3 — Score Doctors

score =
  bias_correction
+ fairness_deficit
+ off_request_bonus
- over_assignment_penalty

---

#### Phase 4 — Assign

- Assign lowest score doctor
- Update bias

---

#### Phase 5 — Validate

Ensure no hard constraint violations

---

## 10. WEEKEND SYSTEM

- Two groups: A / B
- Alternate weekends
- Weekend bias tracked separately
- Cannot compensate with weekday shifts

---

## 11. FRIDAY NIGHT RULE

- Classified as WEEKDAY
- Cannot be assigned to weekend-off group

---

## 12. MUTUAL EXCHANGE SYSTEM

Exchange {
  shift_id
  from_doctor
  to_doctor
  status: pending | accepted | rejected
}

Rules:
- Requires approval
- Changes actual_doctor only
- Does NOT affect fairness

---

## 13. EMERGENCY OVERRIDE

Admin can:
- Reassign any shift
- Override constraints

All actions logged

---

## 14. AUDIT LOG (MANDATORY)

AuditLog {
  id
  action_type
  actor
  timestamp
  details
}

Tracks:
- roster generation
- shift edits
- leave changes
- group changes
- bias changes
- exchanges
- admin overrides

---

## 15. UI REQUIREMENTS

### Core Views

1. Calendar View
   - Day + Night per date
   - Color-coded

2. Doctor Dashboard
   - Personal schedule
   - Duty counts
   - Bias display

3. Fairness Dashboard
   - All doctors comparison

4. Request Panel
   - Off requests
   - Exchange requests

---

### UX Rules

- Mobile-first
- Fast interactions
- Visual fairness indicators

---

## 16. DATA ENTITIES

- Doctor
- Shift
- Assignment
- Leave
- OffRequest
- Exchange
- BiasLedger
- AuditLog
- ShiftType (NEW)

---

## 17. TECH STACK (SUGGESTED)

Frontend:
- React + Tailwind

Backend:
- Node.js / Firebase

---

## 18. V1 SCOPE LIMITATIONS

Excluded:
- Day-of-week pair balancing
- AI optimization tuning
- Multi-unit hospitals
- Patient handover module

---

## 19. SUCCESS CRITERIA

- Equal distribution (within tolerance)
- No constraint violations
- Off requests respected where possible
- Transparent fairness tracking
- Admin control over system behavior

---

## Engineering Quality Expectations

This system is designed for real-world clinical use and must maintain:

- Deterministic and explainable scheduling decisions
- Fairness across users over time (including bias carry-forward)
- Strict enforcement of domain rules (weekend/weekday separation, leave logic, etc.)
- High reliability — no silent failures or inconsistent states
- Full traceability of actions (auditability)

The system must prioritize:

1. Correctness over convenience
2. Fairness over preference
3. Transparency over hidden logic

## Non-Negotiable Principles

- The scheduling engine is the single source of truth
- UI must never influence or override core logic
- All constraints must be enforced centrally
