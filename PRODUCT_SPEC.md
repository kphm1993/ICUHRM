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

Tracked separately:
- weekday_day
- weekday_night
- weekend_day
- weekend_night

---

### 2.2 Constraint Hierarchy

#### HARD CONSTRAINTS (Never violated)
- No assignment during leave
- One doctor per shift
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

### 3.3 ADMIN-CONTROLLED SHIFT CONFIGURATION (NEW)

Admin can:

- Modify shift times globally
- Add new shift types (e.g., SHORT_CALL, ICU_ONCALL)
- Edit existing shift types
- Delete shift types (if unused)

Example:

ShiftType {
  name: "DAY"
  start_time: "08:00"
  end_time: "20:00"
}

IMPORTANT:
- All future roster generations use updated shift definitions
- Past rosters remain unchanged (immutable history)

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

## 5. BIAS SYSTEM

### 5.1 Bias Ledger

BiasLedger {
  doctor_id
  weekday_day
  weekday_night
  weekend_day
  weekend_night
}

WeekdayPairBiasLedger {
  doctor_id
  monday_day
  monday_night
  tuesday_day
  tuesday_night
  wednesday_day
  wednesday_night
  thursday_day
  thursday_night
  friday_day
  friday_night
}

Weekday pair bias is tracked separately from total weekday day/night bias.

Primary fairness priority:
- equalize total weekday day counts
- equalize total weekday night counts
- equalize total weekend day counts
- equalize total weekend night counts

Secondary fairness priority:
- equalize weekday duty-and-day pairs
  (e.g. Tuesday night, Monday day, Friday night)

The scheduling engine must always prioritize correcting total bucket bias before correcting weekday pair bias.

Pair bias should influence candidate scoring only after primary total fairness is preserved as much as possible.

---

### 5.2 Bias Behavior

- Positive = over-assigned
- Negative = under-assigned
- Used in next month roster generation

---

### 5.3 ADMIN BIAS CONTROL (NEW)

Admin can:

#### A. Reset All Bias
- Set all doctors' bias to zero

#### B. Reset Individual Doctor Bias
- Reset selected doctor only

#### C. Manual Bias Adjustment
- Add or subtract bias manually

Example:
+2 weekday_night
-1 weekend_day

IMPORTANT:
- All bias changes must be logged in audit log

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
- Bias ledger
- Shift definitions

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
