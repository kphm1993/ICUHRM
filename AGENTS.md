# AGENTS.md

## PURPOSE

This repository contains a healthcare roster management web app for CCU/ICU use.

Codex must treat this as a **real-world operational scheduling system** where correctness, traceability, and safe incremental edits matter more than speed or novelty.

Primary goal for V1:
- build a fair, explainable, maintainable roster system
- keep logic deterministic
- avoid hidden assumptions
- preserve auditability
- make UI practical for mobile-first hospital use

---

## PROJECT PRIORITIES

When making decisions, use this priority order:

1. Correctness of roster logic
2. Data integrity and historical consistency
3. Clear and maintainable architecture
4. Safe incremental changes
5. Good UX
6. Developer convenience

Do not sacrifice scheduling correctness for UI polish.

---

## WORKING STYLE

### Default behavior
- Read PRODUCT_SPEC.md and SYSTEM_ARCHITECTURE.md before proceeding and editing request
- First understand the existing code before editing
- Prefer minimal, targeted changes
- Preserve current architecture unless the task explicitly asks for refactor
- Avoid sweeping rewrites unless clearly justified
- Keep changes consistent with existing naming and folder structure
- Explain what changed briefly and concretely

### Before editing
For non-trivial tasks:
1. inspect relevant files
2. identify affected modules
3. make a small plan
4. then edit

For vague requests, do **not** guess aggressively.
Instead:
- identify the ambiguity
- state the specific assumption you will use
- proceed conservatively if the ambiguity is minor
- ask for clarification only if the task would otherwise risk breaking logic or editing the wrong surface

---

## Plan Mode Behaviour

When user toggled the plan mode this instruction should be used

Before coding, act as a senior frontend architect.

For this change, decide the cleanest implementation approach for a professional, scalable, maintainable app.

Read docs/PLAN_MODE_RULES.md first

Evaluate whether it needs:
- new files
- new folders
- new components
- new hooks/controllers
- new selectors
- new helpers/resolvers
- only edits to existing files

Return:
1. recommended structure
2. exact file plan
3. reasoning for each addition
4. why this is better than a quick patch
5. possible overengineering risks
6. the minimal clean version

Do not code yet. But give a comprehensive plan

## DOMAIN UNDERSTANDING (MANDATORY)

This project is **not** a generic calendar app.

It is a **medical duty roster system** with the following domain rules:

- fairness is a core feature, not a secondary feature
- weekday and weekend balancing are separate concepts
- leave affects eligibility
- exchanges affect actual performer, not necessarily fairness ownership
- bias carry-forward is part of the scheduling model
- admin overrides must be traceable
- past roster records must remain historically reliable

Never introduce shortcuts that collapse these concepts into one field or one simplistic rule.

---

## ARCHITECTURE RULES

### Separation of concerns
Keep clear separation between:
- UI rendering
- application/use-case logic
- domain scheduling logic
- persistence/data access
- audit logging

Do not bury scheduling logic inside React components.

### Scheduling engine
Scheduling logic should live in dedicated domain/service code.
It should:
- accept structured inputs
- produce structured outputs
- be testable
- avoid direct coupling to UI state

### Historical immutability
Do not make changes that retroactively alter historical roster meaning unless the task explicitly requests a migration or repair path.

Examples:
- editing shift definitions must not silently rewrite old shift instances
- changing a doctor group must not silently erase historical bias meaning
- exchange handling must not destroy original assignment ownership

---

## DATA MODEL RULES

When editing or adding schema/types:

- prefer explicit domain types over loose objects
- avoid `any`
- use clear names that match domain meaning
- keep operational records separate from configuration records
- keep fairness/bias data separate from rendered calendar data
- keep audit log structure append-only in normal flows

Important distinctions to preserve:
- assigned doctor
- actual doctor
- fairness owner
- shift type
- shift instance
- leave
- off request
- exchange request
- bias ledger
- audit event

Do not merge these concepts casually.

---

## SAFETY RULES FOR ROSTER LOGIC

Any change involving roster generation, eligibility, exchange logic, bias handling, leave logic, or admin override behavior is **high risk**.

For such tasks, always do the following:
1. identify all affected rules
2. update related types if needed
3. verify no contradiction with product spec / system architecture
4. avoid partial logic changes that leave stale paths behind
5. mention any unresolved edge case in the summary

If a requested change conflicts with existing business rules, do not ignore the conflict.
Call it out clearly in your response.

---

## UI / UX RULES

This app is mobile-first but should still work well on desktop.

### UI principles
- prioritize clarity over decoration
- scheduling screens should be dense but readable
- avoid visually noisy layouts
- use consistent status colors and badges
- make interactive states obvious
- preserve accessibility and touch usability

### For calendar/roster UI
- day and night shifts must be visually distinguishable
- weekends must be visually distinguishable from weekdays
- exchanged shifts must be identifiable
- leave states must be obvious
- fairness summaries must be easy to scan

Do not create overly clever UI patterns that make roster interpretation harder.

---

## ADMIN FEATURES RULES

Admin capabilities are powerful and must be handled carefully.

When implementing admin actions:
- prefer explicit actions over silent automatic mutation
- add confirmations where destructive or high-impact
- log all important admin actions
- preserve traceability

High-impact admin actions include:
- reset all bias
- adjust individual bias
- modify shift definitions
- reassign shifts
- remove requests
- change weekend groups
- regenerate roster
- override assignments

---

## AUDIT LOGGING RULES

Audit logging is mandatory for important system actions.

At minimum, log:
- roster generation
- roster publication/locking
- manual shift reassignment
- leave add/edit/remove
- bias reset or manual adjustment
- exchange acceptance/rejection/cancellation
- doctor create/delete
- weekend group change
- shift type/time changes

If implementing a new important admin action, also implement or extend audit logging for it.

Do not add major operational features without considering audit implications.

---

## TESTING / VERIFICATION RULES

When making logic changes, verify as much as the repo allows.

Priority areas to validate:
- TypeScript correctness
- imports/exports
- scheduling edge paths
- no obvious type regressions
- no broken references after refactor

When possible, test affected paths rather than only compiling.

If full verification is not possible, say exactly what was and was not verified.

Do not falsely claim full validation.

---

## CHANGE SIZE RULES

Prefer:
- narrow edits
- low-risk refactors
- additive changes
- progressive enhancement

Avoid:
- unrelated cleanup bundled into feature work
- mass renaming without strong reason
- changing architecture and business logic in the same step unless required

If a task naturally expands into multiple domains, note that clearly and keep the implementation organized.

---

## FILE EDITING RULES

When editing:
- preserve formatting conventions already used in the file
- preserve comments unless they are outdated or incorrect
- avoid rewriting entire files when a focused patch is sufficient
- keep components and functions reasonably sized
- extract helpers when complexity grows

When creating new files:
- place them in the most semantically correct folder
- choose names that reflect domain purpose, not generic utility wording
- avoid dumping domain logic into `utils` if it deserves a real module

---

## TYPESCRIPT / REACT RULES

- Use TypeScript-first design
- Prefer explicit types for domain data
- Keep React components focused on presentation and interaction
- Put heavy logic in hooks/services/domain modules
- Avoid prop drilling when it materially harms maintainability
- Prefer predictable state shape over clever abstractions
- Do not introduce unnecessary dependencies unless clearly beneficial

---

## STATE MANAGEMENT RULES

If state logic grows:
- separate derived selectors from raw state
- keep business rules outside presentation components
- avoid duplicating authoritative data in multiple places
- preserve a single source of truth for roster records when possible

---

## SCHEDULING ENGINE IMPLEMENTATION RULES

When editing the generator:
- keep hard constraints explicit
- keep soft constraints explicit
- do not mix them invisibly
- prefer deterministic ordering and tie-breaking
- avoid randomness unless explicitly requested
- centralize scoring weights/config when feasible

The engine should remain explainable:
a human admin should be able to understand why a doctor was assigned.

---

## EXCHANGE LOGIC RULES

Mutual exchange is not a simple reassignment unless product rules explicitly say so.

Preserve distinction between:
- original scheduled owner
- actual worked shift after exchange
- fairness accounting owner

Do not simplify exchange flow in a way that breaks fairness tracking.

---

## BIAS RULES

Bias is a domain ledger, not a cosmetic counter.

When implementing bias features:
- preserve separate dimensions where required
- do not silently zero or recompute historical values unless requested
- make reset/adjust flows explicit and auditable
- ensure UI labels make the meaning clear

---

## COMMUNICATION STYLE

After completing a task, return a brief structured summary:

Summary:
- what changed
- key files touched
- important logic decisions
- any risk / follow-up note

Keep summaries concise.
Do not dump large file contents unless explicitly requested.

---

## CHANGELOG / LOGGING BEHAVIOR

Do not update CHANGELOG files automatically unless explicitly requested.

If the user asks for a changelog entry:
- write only the requested log/update
- keep it concise
- do not produce large duplicate logs in chat unless asked

---

## WHEN A REQUEST IS VAGUE

If the request does not clearly identify:
- app area
- file area
- UI surface
- data flow
- intended behavior

then first inspect the repo and infer the most likely target.

If still ambiguous and risky:
- state the ambiguity
- propose the safest interpretation
- avoid editing the wrong surface

Do not invent large features from one vague sentence.

---

## WHEN TO SUGGEST A BETTER APPROACH

If the user asks for an implementation that is likely to create technical debt, rule conflicts, or fragile behavior:
- say so clearly
- suggest a safer architecture
- still try to help within the requested direction

Be pragmatic, not obstructive.

---

## NON-GOALS FOR V1

Unless explicitly requested, do not expand scope into:
- patient handover workflows
- multi-hospital support
- payroll
- messaging integrations
- advanced analytics
- AI auto-optimization
- overly complex fairness dimensions beyond the approved spec

Protect V1 from scope creep.

---

## ENGINEERING QUALITY STANDARD (MANDATORY)

All implementations MUST maintain production-grade quality consistent with existing architecture.

The agent MUST:

- Preserve separation of layers:
  - UI (components, pages)
  - Application services
  - Domain engine (scheduling)
  - Persistence layer

- NEVER introduce business logic into:
  - UI components
  - React hooks
  - Controllers

- NEVER bypass the domain engine for scheduling decisions

- Prefer extending existing modules over creating duplicate logic

- Ensure all new code:
  - Is modular
  - Is readable
  - Uses consistent naming conventions
  - Avoids tight coupling

- If a request risks breaking architecture:
  → STOP and ask for clarification

- If unsure where logic belongs:
  → Ask: UI vs Service vs Domain vs Persistence

## FINAL RULE

When in doubt, choose the option that is:
- more explicit
- more auditable
- less magical
- easier to maintain
- safer for a real hospital roster workflow