# UI_SURFACE_INDEX.md

## 1. Purpose

This document maps the current UI surfaces of the ICU HRM app for precise future edits. It is the canonical source for identifying where to make changes and how UI elements are organized.

## 2. How to use this index

- Find the target route/page by scanning the Route/Page Index.
- Drill into Detailed Page Surfaces to locate the exact section/component.
- Use Reusable/Shared UI Components and Forms sections for repeated elements.
- Apply Suggested Surface Reference Syntax in task instructions.

## 3. Surface hierarchy conventions

- Hierarchies are expressed as `App > [Parent] > [Child] > ...`.
- Canonical names use the exact component/page names from source files.
- Common references are short aliases used by developers.

## 4. Global app shell

- App
  - `AppRouter` (src/app/router.tsx)
  - `AppShell` (src/app/layouts/AppShell.tsx)
    - Header
      - App title
      - Role badge
      - Sign out button
    - Navigation bar
      - Roster
      - Doctor Dashboard
      - Fairness
      - Requests
      - Admin Tools (ADMIN only)
    - Main content (React Router `<Outlet />`)

## 5. Route/page index

1. `/login` -> `LoginPage` (src/features/auth/pages/LoginPage.tsx)
2. `/roster` -> `RosterPage` (src/features/roster/pages/RosterPage.tsx)
3. `/doctor-dashboard` -> `DoctorDashboardPage` (src/features/doctors/pages/DoctorDashboardPage.tsx)
4. `/dashboard/roster-calendar` -> `DoctorRosterCalendarPage` (src/features/roster/pages/DoctorRosterCalendarPage.tsx)
5. `/fairness` -> `FairnessDashboardPage` (src/features/fairness/pages/FairnessDashboardPage.tsx)
6. `/requests` -> `RequestsPage` (src/features/requests/pages/RequestsPage.tsx) [placeholder]
7. `/admin` -> `AdminSettingsPage` (src/features/admin/pages/AdminSettingsPage.tsx) [ADMIN only]

## 6. Detailed page surfaces

### App > Global shell > Header
- Component: `AppShell` (src/app/layouts/AppShell.tsx)
- Purpose: persistent top-level branding + user info + logout
- Elements: app label, title, role badge, user displayName, Sign Out button
- Interactions: ``logout()`` via AuthContext

### App > Global shell > Navigation
- Component: `AppShell`
- Purpose: primary route navigation
- Elements: NavLink buttons for /roster /doctor-dashboard /fairness /requests /admin
- Notes: role-based visibility via `visibleNavigation` filter

### Roster page (`/roster`) - Admin mode: Admin Roster Review
- Component: `RosterPage` -> `AdminRosterPage` section
- Purpose: roster audit/workflow for admins
- Sections:
  - Status panel: roster status/created/published/locked
  - RosterWarningsPanel (src/features/roster/components/RosterWarningsPanel.tsx)
  - RosterValidationPanel (src/features/roster/components/RosterValidationPanel.tsx)
  - RosterDoctorSummaryTable (src/features/roster/components/RosterDoctorSummaryTable.tsx)
  - RosterCalendar (src/features/roster/components/RosterCalendar.tsx)

### Roster page (`/roster`) - Doctor mode: Read-only Active Roster
- Component: `RosterPage` -> `DoctorRosterPage`
- Purpose: doctors view published roster
- Sections:
  - Month selector
  - Active snapshot status
  - RosterCalendar component

### Doctor dashboard (`/doctor-dashboard`)
- Component: `DoctorDashboardPage` (src/features/doctors/pages/DoctorDashboardPage.tsx)
- Purpose: entry landing for doctor workflows
- Sections: primary action card (Open Roster Calendar), next-step bullets

### Doctor roster calendar (`/dashboard/roster-calendar`)
- Component: `DoctorRosterCalendarPage` (src/features/roster/pages/DoctorRosterCalendarPage.tsx)
- Purpose: month-level roster calendar with highlighting
- Sections:
  - title/description
  - month selector + snapshot metadata
  - back link to doctor dashboard
  - RosterCalendar component

### Fairness dashboard (`/fairness`)
- Component: `FairnessDashboardPage` (src/features/fairness/pages/FairnessDashboardPage.tsx)
- Purpose: compare fairness totals and bias table
- Sections:
  - month selector + snapshot metadata
  - error/loader
  - `FairnessComparisonTable` (src/features/fairness/components/FairnessComparisonTable.tsx)

### Requests placeholder (`/requests`)
- Component: `RequestsPage` (src/features/requests/pages/RequestsPage.tsx)
- Purpose: placeholder explanation of future requests surface
- Notes: does not implement off-request or exchange UI yet

### Admin settings (`/admin`)
- Component: `AdminSettingsPage` (src/features/admin/pages/AdminSettingsPage.tsx)
- Purpose: top-level admin tool dashboard
- Includes:
  - `AdminRosterWorkflowToolsSection` (src/features/roster/components/AdminRosterWorkflowToolsSection.tsx)
  - `DoctorManagementSection` (src/features/doctors/components/DoctorManagementSection.tsx)

### Doctor management section (`/admin` subcomponent)
- Component: `DoctorManagementSection` (src/features/doctors/components/DoctorManagementSection.tsx)
- Subcomponents:
  - `DoctorList` (src/features/doctors/components/DoctorList.tsx)
    - doctor row selector
    - status badge
    - weekend group badge
  - `DoctorEditorForm` (src/features/doctors/components/DoctorEditorForm.tsx)
    - full name, phone, unique ID, weekend group, temporary password
    - create/update/cancel/delete/toggle status buttons

## 7. Reusable/shared UI components

### Roster calendar set
- `RosterCalendar` (src/features/roster/components/RosterCalendar.tsx)
  - handles selection state and doctor filter
  - uses `buildRosterCalendarViewModel` from selectors
- `RosterCalendarView` (src/features/roster/components/RosterCalendarView.tsx)
  - grid rendering for weeks, days, and day/night slots
  - day card: `daySlot`, `nightSlot`, extra shift badge
  - slot component: `RosterShiftSlot`, `SlotEntry`, `SlotPlaceholder`

### Roster panels
- `RosterWarningsPanel` (warnings list)
- `RosterValidationPanel` (hard constraint issues)
- `RosterDoctorSummaryTable` (doctor load and bias summary)
- `RosterLifecycleActions` + `RosterGenerationPanel` (in admin section but controls workflow actions)
- `AdminRosterWorkflowToolsSection` (workflow tools) (source: src/features/roster/components/AdminRosterWorkflowToolsSection.tsx)

### Auth/role handling
- `LoginPage` numerous role entry cards
- `RequireAuth`, `RequireRole` wrappers (src/features/auth/components)

### Shared scaffold
- `PagePlaceholder` (src/shared/ui/PagePlaceholder.tsx)

## 8. Forms and interactive controls

### Month selector input
- common across roster/fairness/doctor-calendar: `<input type="month" />`
- elements in RosterPage, DoctorRosterCalendarPage, FairnessDashboardPage

### Doctor filter dropdown
- in `RosterCalendar`:
  - select `viewModel.doctorOptions`
  - Clear button

### Doctor management forms
- `DoctorEditorForm` fields:
  - Full name
  - Phone number
  - Unique ID
  - Weekend group select
  - Temporary password
  - Submit/cancel/toggle status/delete

### Roster snapshot buttons (admin)
- `Review Draft`, `Review Official` in RosterPage
- `Generate`, `Publish`, `Lock` in `AdminRosterWorkflowToolsSection` (see file)

### Cell actions (calendar)
- day/week grid cells are keyboard focusable (role="group", tabIndex=0)
- slots provide `aria-label` and `title`

## 9. Suggested surface reference syntax

Use `Area > Page > Section > Component > Element`.

Examples:
- `App > Global shell > Navigation > Menu > Roster link`
- `App > Roster page > Admin mode > Calendar review > Doctor filter dropdown`
- `App > Roster page > Admin mode > Warnings panel > warning item`
- `App > Admin settings > Doctor management > Doctor row > Weekend group badge`
- `App > Doctor roster calendar > Month selector > {input}`
- `App > Fairness dashboard > Comparison table > row -> Doctor label`
- `App > Roster calendar > Week cell > Night slot > doctor name entry`
- `App > Global shell > Header > Sign out button`

## 10. Maintenance rules

- Update this file whenever a major page or component is added, removed, renamed, or restructured.
- Prefer incremental edits (add or adjust path/sections) rather than rewriting the whole file.
- Keep canonical names stable; use aliases when components are renamed slowly.
- Mark placeholder screens explicitly (Requests page currently placeholder).
- For new region-specific behavior (e.g., calendar cell drag/resize, audit log section), add specific subsections under Detailed Page Surfaces.
