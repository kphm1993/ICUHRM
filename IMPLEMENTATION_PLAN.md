# Dynamic Bias System Implementation — Agent Prompts Ready

## SUMMARY

The ICU HRM app has been configured to transition from a **hardcoded 4-bucket bias system** (weekdayDay, weekdayNight, weekendDay, weekendNight) to a **flexible, admin-defined bias criteria system**.

## AGENT PROMPTS CREATED

Four detailed agent prompts have been generated and are ready to use:

### Phase 1: Models & Repositories
📄 **File:** [AGENT_PROMPT_PHASE_1.md](AGENT_PROMPT_PHASE_1.md)

**Focus:** Domain models and persistence layer
- Create DutyLocation model and repository
- Create BiasCriteria model and repository
- Update BiasLedger to use dynamic balances
- Update Shift model to include locationId
- Create in-memory implementations
- Define error classes

**Deliverables:** 12 items
**Estimated Effort:** ~4–6 hours

---

### Phase 2: Admin Services & UI
📄 **File:** [AGENT_PROMPT_PHASE_2.md](AGENT_PROMPT_PHASE_2.md)

**Focus:** Admin service layer and user interface
- Implement DutyLocationManagementService
- Implement BiasCriteriaManagementService
- Create AdminLocationsPage (location CRUD UI)
- Create AdminBiasCriteriaPage (visual criteria builder)
- Integrate services into AppServicesProvider
- Update admin navigation

**Deliverables:** 8 items (UI/UX heavy)
**Estimated Effort:** ~8–10 hours

**Key Feature:** Visual criteria builder where admins check locations, shift types, and weekdays to create custom tracking dimensions.

---

### Phase 3: Scheduler Updates
📄 **File:** [AGENT_PROMPT_PHASE_3.md](AGENT_PROMPT_PHASE_3.md)

**Focus:** Roster generation engine
- Create determineBiasCriteriaForShift() helper
- Update fairnessState.ts for dynamic criteria
- Update generateRoster.ts to use dynamic criteria
- Update scoreCandidates.ts to score by criteria
- Update shift pool generation to include locations
- Update RosterSnapshot to capture criteria snapshots
- Add validation for locations and criteria

**Deliverables:** 9 items (logic-heavy)
**Estimated Effort:** ~6–8 hours

**Critical Rule:** Past rosters are immutable—new criteria only affect future generations.

---

### Phase 4: Integration & Validation
📄 **File:** [AGENT_PROMPT_PHASE_4.md](AGENT_PROMPT_PHASE_4.md)

**Focus:** End-to-end integration and testing
- Complete route integration
- Audit logging for all mutations
- Error handling and user feedback
- Data seeding for testing
- Validate historical immutability
- End-to-end scenario test
- Documentation

**Deliverables:** 10 items
**Estimated Effort:** ~4–6 hours

---

## PRODUCT SPEC UPDATED

📄 **File:** [PRODUCT_SPEC.md](PRODUCT_SPEC.md)

Updated sections:
- ✅ **Section 2.1** — Fairness Model now describes admin-defined criteria
- ✅ **Section 3.1** — Shift model now includes location_id
- ✅ **Section 3.3–3.4** — Admin shift config + new duty location management
- ✅ **Section 5** — Entire bias system redesigned for dynamic criteria
- ✅ **Section 9** — Roster generation inputs updated

---

## HOW TO USE THESE PROMPTS

### Option A: User Implements via Agents
1. Copy the content of [AGENT_PROMPT_PHASE_1.md](AGENT_PROMPT_PHASE_1.md)
2. Invoke an agent with that prompt
3. After Phase 1 is complete, repeat for Phases 2–4

### Option B: Copilot Implements Directly
Provide any of the phase prompts to Copilot in chat, and Copilot will implement directly.

### Option C: Manual Implementation
Follow the prompts as implementation guides without agent assistance.

---

## IMPLEMENTATION SEQUENCE

**Recommended order (do NOT skip):**

1. ✅ **Phase 1 First** — Models and repositories must exist before anything else
2. ✅ **Phase 2 Second** — Admin UI needs services from Phase 1
3. ✅ **Phase 3 Third** — Scheduler needs models and admin setup
4. ✅ **Phase 4 Last** — Integration ties everything together

Each phase is self-contained but **depends on previous phases**.

---

## KEY ARCHITECTURAL DECISIONS

### No Breaking Changes
- Old BiasLedger format can coexist with new format (soft migration)
- Past rosters capture criteria snapshots—never retroactively affected
- All constraints (hard, soft) remain unchanged

### Admin Control
- App initializes with **zero criteria defined**
- Admin must create at least one criteria before roster generation
- Deletion of criteria/locations prevented if in-use

### Audit Trail
- All location/criteria mutations logged
- Roster generation logs active criteria snapshot
- Full traceability for compliance

### Flexibility
- Admins can combine any location + shift type + weekday
- New criteria take effect immediately for future rosters
- Wildcard matching: empty locationIds = all locations

---

## EDGE CASES HANDLED

| Edge Case | Handling |
|-----------|----------|
| No criteria defined | NoCriteriaDefinedError thrown on roster generation |
| Delete location used by shifts | LocationInUseError blocks deletion |
| Delete criteria used by past rosters | CriteriaInUseError blocks deletion |
| Shift has no location | Assign default or require location in input |
| Multiple criteria match shift | All matching criteria incremented |
| Admin modifies criteria mid-month | Next roster generation uses updated criteria |

---

## VERIFICATION CHECKLIST (All Phases)

After implementation, verify:

- [ ] DutyLocation model & repository working
- [ ] BiasCriteria model & repository working
- [ ] AdminLocationsPage functional
- [ ] AdminBiasCriteriaPage with visual builder functional
- [ ] Roster generation loads and validates criteria
- [ ] Shifts created with locationId
- [ ] Bias ledger uses dynamic balances (Record<criteriaId, number>)
- [ ] Fairness scoring uses dynamic criteria
- [ ] Past rosters immutable (snapshots unchanged)
- [ ] Audit logging complete for all mutations
- [ ] Error handling for all error cases
- [ ] No TypeScript errors
- [ ] Mobile UI responsive
- [ ] End-to-end scenario test passes

---

## TOTAL ESTIMATED EFFORT

| Phase | Effort | Notes |
|-------|--------|-------|
| Phase 1 | 4–6 hrs | Models & repositories (straightforward) |
| Phase 2 | 8–10 hrs | Admin UI with visual builder (complexity in builder) |
| Phase 3 | 6–8 hrs | Scheduler logic (critical, needs verification) |
| Phase 4 | 4–6 hrs | Integration & validation |
| **Total** | **22–30 hrs** | Can be done in parallel by team |

---

## NEXT STEPS

1. **Review** all four phase prompts
2. **Choose implementation approach** (agents, direct, or hybrid)
3. **Start Phase 1** — models first
4. **Proceed sequentially** through phases
5. **Verify** at each milestone
6. **Test end-to-end** before declaring complete

---

## NOTES FOR IMPLEMENTATION

- **Backward Compatibility:** Keep import paths clean; new models go in `src/domain/models/`
- **Naming Convention:** Use `BiasCriteria` (not `BiasRule` or `FairnessRule`)
- **Audit Logging:** Every mutation must be logged via `AuditLogService`
- **Error Messages:** User-friendly, actionable (tell admin what to do)
- **Mobile First:** Ensure all UI is touch-friendly and responsive
- **Type Safety:** Use `EntityId` for all IDs, `ISODateTimeString` for timestamps
- **Testing:** Consider adding unit tests for `determineBiasCriteria()` and fairness state logic

---

## QUESTIONS?

If any phase needs clarification before implementation, refer to:
- `PRODUCT_SPEC.md` — Product requirements
- `SYSTEM_ARCHITECTURE.md` — System design
- `AGENTS.md` — Project standards

---

**All prompts are ready. Proceed to Phase 1 when ready.**
