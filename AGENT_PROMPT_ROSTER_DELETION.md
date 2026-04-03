# AGENT IMPLEMENTATION: Roster Deletion Feature

## OBJECTIVE
Add safe roster deletion capability for admins only. Admins can delete DRAFT rosters freely, but cannot delete PUBLISHED or LOCKED rosters (to preserve historical integrity and bias audit trails).

## SCOPE

Admin-only actions:
- Delete a DRAFT roster (with confirmation)
- CANNOT delete PUBLISHED rosters
- CANNOT delete LOCKED rosters
- All deletions are soft-deletes (marked as deleted, not hard-removed) for audit integrity

## DATA MODEL UPDATES

### Update Roster Model
File: `src/domain/models/Roster.ts`

Add field to mark soft deletion:
```typescript
export interface Roster {
  readonly id: EntityId;
  readonly period: RosterPeriod;
  readonly status: RosterStatus;
  readonly isDeleted: boolean; // NEW: soft delete flag
  readonly deletedAt?: ISODateTimeString; // NEW: timestamp of deletion
  readonly deletedByActorId?: EntityId; // NEW: who deleted it
  readonly createdAt: ISODateTimeString;
  readonly createdByUserId: EntityId;
  readonly generatedAt?: ISODateTimeString;
  readonly publishedAt?: ISODateTimeString;
  readonly lockedAt?: ISODateTimeString;
  readonly weekendGroupSchedule: ReadonlyArray<WeekendGroupScheduleEntry>;
  readonly notes?: string;
}
```

## BUSINESS RULES

### Deletion Rules (Hard Constraints)
- ✅ DRAFT rosters CAN be deleted by admins
- ❌ PUBLISHED rosters CANNOT be deleted (already issued to staff)
- ❌ LOCKED rosters CANNOT be deleted (official record)

**Rationale:**
- Draft = work-in-progress, safe to discard
- Published = communicated to doctors, deleting breaks trust and audit trail
- Locked = final record, must be preserved for compliance

### Deletion Effects
- Soft delete only (set `isDeleted = true`, do not remove from database)
- Do NOT affect bias ledger or fairness history
- Do NOT affect doctors or shifts (just mark the snapshot as deleted)
- Audit log entry required for traceability

### User Feedback
- Show confirmation dialog before deletion: "Delete this draft roster? This cannot be undone."
- Success message: "Draft roster deleted."
- Error message if PUBLISHED/LOCKED: "Cannot delete published or locked rosters. Delete this draft and generate a new one instead."

## SERVICE LAYER

### Update RosterWorkflowService Interface
File: `src/features/roster/services/rosterWorkflowService.ts`

Add method to interface:
```typescript
export interface RosterWorkflowService {
  getMonthContext(input: GetRosterMonthContextInput): Promise<RosterMonthContext>;
  generateDraft(input: GenerateDraftRosterInput): Promise<RosterSnapshot>;
  publishDraft(input: PublishDraftRosterInput): Promise<RosterSnapshot>;
  lockPublishedRoster(input: LockPublishedRosterInput): Promise<RosterSnapshot>;
  
  // NEW METHOD
  deleteDraftRoster(input: {
    readonly draftRosterId: EntityId;
    readonly actorId: EntityId;
    readonly actorRole: ActorRole;
  }): Promise<void>;
}
```

### Implementation
File: `src/features/roster/services/rosterWorkflowService.ts`

Add implementation:
```typescript
async deleteDraftRoster(input: {
  readonly draftRosterId: EntityId;
  readonly actorId: EntityId;
  readonly actorRole: ActorRole;
}): Promise<void> {
  // 1. Verify admin access only
  if (input.actorRole !== 'ADMIN') {
    throw new UnauthorizedError('Only admins can delete rosters.');
  }

  // 2. Load the roster snapshot
  const snapshot = await this.rosterSnapshotRepository.getById(input.draftRosterId);
  if (!snapshot) {
    throw new RosterNotFoundError(`Roster ${input.draftRosterId} not found.`);
  }

  // 3. Check status—only allow DRAFT deletion
  if (snapshot.roster.status !== 'DRAFT') {
    throw new RosterDeletionError(
      `Cannot delete ${snapshot.roster.status} roster. Only DRAFT rosters can be deleted.`
    );
  }

  // 4. Mark as deleted (soft delete)
  const now = new Date().toISOString();
  const updatedSnapshot = {
    ...snapshot,
    roster: {
      ...snapshot.roster,
      isDeleted: true,
      deletedAt: now as ISODateTimeString,
      deletedByActorId: input.actorId
    }
  };

  // 5. Save the updated snapshot
  await this.rosterSnapshotRepository.update(input.draftRosterId, updatedSnapshot);

  // 6. Log audit event
  await this.auditLogService.logRosterDeleted({
    rosterId: input.draftRosterId,
    rosterMonth: snapshot.generatedInputSummary.rosterMonth,
    status: snapshot.roster.status,
    actorId: input.actorId,
    actorRole: input.actorRole
  });
}
```

## REPOSITORY LAYER

### Update RosterSnapshotRepository
File: `src/domain/repositories/RosterSnapshotRepository.ts`

Ensure the interface supports updating:
```typescript
export interface RosterSnapshotRepository {
  // ... existing methods ...
  
  // Verify this method exists to support deletion
  update(id: EntityId, snapshot: Partial<RosterSnapshot>): Promise<RosterSnapshot>;
}
```

### Update In-Memory Implementation
File: `src/infrastructure/repositories/inMemory/InMemoryRosterSnapshotRepository.ts`

Ensure `update()` method:
- Sets `isDeleted = true` on the roster object
- Preserves all other data
- Updates `updatedAt` timestamp if applicable

## ERROR HANDLING

### New Error Classes
File: `src/domain/repositories/errors.ts`

Add:
```typescript
export class RosterDeletionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RosterDeletionError';
  }
}

export class RosterNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RosterNotFoundError';
  }
}

export class UnauthorizedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UnauthorizedError';
  }
}
```

### Error Handling in Service
Catch and handle:
- `RosterNotFoundError` — "Roster not found. It may have already been deleted."
- `RosterDeletionError` — "Cannot delete published or locked rosters. Only drafts can be deleted."
- `UnauthorizedError` — "You do not have permission to delete rosters. Contact admin."

## AUDIT LOGGING

### Add Audit Log Entry
File: `src/features/audit/services/auditLogService.ts`

Add method:
```typescript
async logRosterDeleted(input: {
  rosterId: EntityId;
  rosterMonth: YearMonthString;
  status: RosterStatus;
  actorId: EntityId;
  actorRole: ActorRole;
}): Promise<void> {
  return this.create({
    actionType: 'ROSTER_DELETED',
    actor: {
      id: input.actorId,
      role: input.actorRole
    },
    details: {
      rosterId: input.rosterId,
      rosterMonth: input.rosterMonth,
      rosterStatus: input.status,
      timestamp: new Date().toISOString()
    }
  });
}
```

### Audit Entry Format
```
Action: ROSTER_DELETED
Details:
  - rosterId: [UUID]
  - rosterMonth: 2026-04
  - rosterStatus: DRAFT
  - actor: admin_user_id
  - timestamp: 2026-04-03T10:30:00Z
```

## UI IMPLEMENTATION

### Add Delete Button to Roster View
File: `src/features/roster/pages/RosterPage.tsx`

Update the roster snapshot section:

```typescript
// Add to the action buttons area (alongside Generate, Publish, Lock buttons)

{!workflow.isLoading && workflow.displaySnapshot ? (
  <div className="flex flex-wrap gap-2">
    {/* ... existing Generate/Publish/Lock buttons ... */}
    
    {workflow.displaySnapshot.roster.status === 'DRAFT' && !workflow.displaySnapshot.roster.isDeleted ? (
      <button
        onClick={() => setShowDeleteConfirmation(true)}
        className="rounded-lg border border-rose-300 bg-rose-50 px-4 py-2 text-sm font-medium text-rose-700 hover:bg-rose-100 disabled:opacity-50"
        disabled={workflow.isLoading}
      >
        Delete Draft
      </button>
    ) : null}
  </div>
) : null}
```

### Delete Confirmation Dialog
File: `src/features/roster/pages/RosterPage.tsx`

Add state:
```typescript
const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
const [isDeleting, setIsDeleting] = useState(false);
const [deleteError, setDeleteError] = useState<string | null>(null);
```

Add handler:
```typescript
async function handleDeleteDraft() {
  if (!workflow.displaySnapshot) return;
  
  setIsDeleting(true);
  setDeleteError(null);
  
  try {
    await workflow.deleteDraftRoster(workflow.displaySnapshot.roster.id);
    setShowDeleteConfirmation(false);
    // Reload context or navigate away
    await workflow.reloadContext();
    // Show success toast
    showSuccessToast('Draft roster deleted.');
  } catch (error) {
    if (error instanceof RosterDeletionError) {
      setDeleteError('Cannot delete published or locked rosters.');
    } else if (error instanceof UnauthorizedError) {
      setDeleteError('You do not have permission to delete rosters.');
    } else {
      setDeleteError('Failed to delete roster: ' + error.message);
    }
  } finally {
    setIsDeleting(false);
  }
}
```

Add confirmation modal:
```typescript
{showDeleteConfirmation && workflow.displaySnapshot ? (
  <div className="fixed inset-0 flex items-center justify-center bg-black/20">
    <div className="rounded-2xl bg-white p-6 shadow-lg">
      <h3 className="text-lg font-semibold text-slate-900">Delete Draft Roster?</h3>
      <p className="mt-2 text-sm text-slate-600">
        This will permanently delete the draft for {formatRosterMonth(workflow.displaySnapshot.generatedInputSummary.rosterMonth)}.
        This action cannot be undone.
      </p>
      
      {deleteError ? (
        <div className="mt-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">
          {deleteError}
        </div>
      ) : null}
      
      <div className="mt-6 flex gap-3 justify-end">
        <button
          onClick={() => setShowDeleteConfirmation(false)}
          disabled={isDeleting}
          className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg"
        >
          Cancel
        </button>
        <button
          onClick={handleDeleteDraft}
          disabled={isDeleting}
          className="px-4 py-2 text-sm font-medium text-white bg-rose-600 hover:bg-rose-700 rounded-lg disabled:opacity-50"
        >
          {isDeleting ? 'Deleting...' : 'Delete'}
        </button>
      </div>
    </div>
  </div>
) : null}
```

### Update Roster Workflow Hook
File: `src/features/roster/hooks/useAdminRosterWorkflow.ts`

Add method to hook:
```typescript
async function deleteDraftRoster(rosterId: EntityId) {
  return rosterWorkflowService.deleteDraftRoster({
    draftRosterId: rosterId,
    actorId: user?.id ?? '',
    actorRole: role ?? 'DOCTOR'
  });
}

// Return alongside other methods
return {
  // ... existing returns ...
  deleteDraftRoster
};
```

## FILTERING IN LIST VIEWS

### Exclude Deleted Rosters from Display
File: `src/features/roster/services/rosterWorkflowService.ts`

Update `getMonthContext()` to filter out deleted rosters:

```typescript
// When loading snapshots
const snapshots = await this.rosterSnapshotRepository.listByMonth(rosterMonth);
const activeSnapshots = snapshots.filter(s => !s.roster.isDeleted); // NEW: exclude deleted

const latestDraft = findLatestSnapshotByStatus(activeSnapshots, 'DRAFT');
const latestPublished = findLatestSnapshotByStatus(activeSnapshots, 'PUBLISHED');
const latestLocked = findLatestSnapshotByStatus(activeSnapshots, 'LOCKED');
```

Also update `RosterMonthContext` to only return active snapshots:
```typescript
readonly snapshots: ReadonlyArray<RosterSnapshot>; // already filtered (no deleted)
```

## VERIFICATION CHECKLIST

- [ ] Roster model includes `isDeleted`, `deletedAt`, `deletedByActorId` fields
- [ ] RosterWorkflowService.deleteDraftRoster() method implemented
- [ ] Deletion only allows DRAFT status (blocks PUBLISHED/LOCKED)
- [ ] Soft delete only (data preserved in database)
- [ ] Audit logging implemented for roster deletions
- [ ] Error classes created (RosterDeletionError, UnauthorizedError, RosterNotFoundError)
- [ ] Delete button appears only for DRAFT rosters
- [ ] Confirmation dialog shows before deletion
- [ ] Error handling displays user-friendly messages
- [ ] Admin-only access enforced (ADMIN role required)
- [ ] Deleted rosters excluded from list views and displays
- [ ] No TypeScript errors
- [ ] Mobile UI works well (dialog is responsive)
- [ ] Audit trail shows deletion event

## EDGE CASES

| Case | Handling |
|------|----------|
| User tries to delete PUBLISHED roster | Show error: "Cannot delete published rosters" |
| User tries to delete LOCKED roster | Show error: "Cannot delete locked rosters" |
| User is DOCTOR role | 403 Unauthorized: "Only admins can delete" |
| Roster already deleted | 404 Not Found: "Roster not found" |
| Delete fails (network error) | Show error toast, allow retry |
| Multiple admins try to delete same roster | Last one succeeds, others see "already deleted" |

## NOTES

- Soft delete preserves audit trail and historical integrity
- Deleted rosters are hidden from UI views but accessible via audit log
- Future enhancement: Admin view showing deletion history (timeline)
- Do NOT hard-delete rosters even on explicit request—compliance requires preservation

## RELATED FEATURES (NOT IN SCOPE)

These are out of scope but may be worth future consideration:
- Un-delete/restore a draft roster
- Bulk delete multiple drafts
- Archive rosters (similar concept, different purpose)
- Purge very old rosters (compliance retention policy)

---

**This prompt is ready for agent implementation. Proceed when ready.**
