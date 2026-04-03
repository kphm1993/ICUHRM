# AGENT IMPLEMENTATION: PHASE 1 — Models & Repositories

## OBJECTIVE
Replace the hardcoded 4-bucket bias system with a flexible admin-defined bias criteria system. This phase implements the data models and persistence layer.

## CONTEXT
- Current bias is hardcoded: `weekdayDay`, `weekdayNight`, `weekendDay`, `weekendNight`
- New system allows admins to create custom tracking dimensions
- Past rosters are **immutable** — new bias criteria only apply to future rosters

## DELIVERABLES

### 1. Add DayOfWeek Enum
File: `src/domain/models/primitives.ts`

Add:
```typescript
export type DayOfWeek = 'MON' | 'TUE' | 'WED' | 'THU' | 'FRI' | 'SAT' | 'SUN';
```

### 2. Create DutyLocation Model
File: `src/domain/models/DutyLocation.ts` (new file)

```typescript
import type { EntityId, ISODateTimeString } from "@/domain/models/primitives";

export interface DutyLocation {
  readonly id: EntityId;
  readonly code: string; // unique, e.g., "CCU", "ICCU"
  readonly label: string; // e.g., "Cardiac Care Unit"
  readonly description?: string;
  readonly isActive: boolean;
  readonly createdAt: ISODateTimeString;
  readonly updatedAt: ISODateTimeString;
}
```

### 3. Create BiasCriteria Model
File: `src/domain/models/BiasCriteria.ts` (new file)

```typescript
import type { EntityId, ISODateTimeString, DayOfWeek } from "@/domain/models/primitives";

export interface BiasCriteria {
  readonly id: EntityId;
  readonly code: string; // unique, e.g., "CCU_MONDAY_NIGHT"
  readonly label: string; // e.g., "CCU Monday Night"
  readonly locationIds: ReadonlyArray<EntityId>; // empty = applies to all locations
  readonly shiftTypeIds: ReadonlyArray<EntityId>; // empty = applies to all shift types
  readonly weekdayConditions: ReadonlyArray<DayOfWeek>; // empty = all days
  readonly isWeekendOnly: boolean; // if true, only apply to weekend days
  readonly isActive: boolean;
  readonly createdAt: ISODateTimeString;
  readonly updatedAt: ISODateTimeString;
  readonly createdByActorId: EntityId;
  readonly updatedByActorId: EntityId;
}
```

### 4. Update BiasLedger Model
File: `src/domain/models/BiasLedger.ts`

Replace `balance: BiasBalance` with:
```typescript
readonly balances: Readonly<Record<EntityId, number>>;
```

Keep the full interface as:
```typescript
export interface BiasLedger {
  readonly id: EntityId;
  readonly doctorId: EntityId;
  readonly effectiveMonth: YearMonthString;
  readonly balances: Readonly<Record<EntityId, number>>; // key = BiasCriteria.id
  readonly source: BiasLedgerSource;
  readonly sourceReferenceId?: EntityId;
  readonly updatedAt: ISODateTimeString;
  readonly updatedByActorId: EntityId;
}
```

### 5. Update Shift Model
File: `src/domain/models/Shift.ts`

Add field:
```typescript
readonly locationId: EntityId; // reference to DutyLocation
```

Also update `ShiftDefinitionSnapshot` to include:
```typescript
readonly locationId: EntityId;
```

### 6. Export New Models
File: `src/domain/models/index.ts`

Add exports:
```typescript
export type { DutyLocation } from "@/domain/models/DutyLocation";
export type { BiasCriteria } from "@/domain/models/BiasCriteria";
```

### 7. Create DutyLocationRepository
File: `src/domain/repositories/DutyLocationRepository.ts` (new file)

```typescript
import type { EntityId } from "@/domain/models";
import type { DutyLocation } from "@/domain/models/DutyLocation";

export interface DutyLocationRepository {
  create(location: DutyLocation): Promise<DutyLocation>;
  update(id: EntityId, changes: Partial<DutyLocation>): Promise<DutyLocation>;
  delete(id: EntityId): Promise<void>;
  getById(id: EntityId): Promise<DutyLocation | null>;
  listActive(): Promise<ReadonlyArray<DutyLocation>>;
  listAll(): Promise<ReadonlyArray<DutyLocation>>;
}
```

### 8. Create BiasCriteriaRepository
File: `src/domain/repositories/BiasCriteriaRepository.ts` (new file)

```typescript
import type { EntityId } from "@/domain/models";
import type { BiasCriteria } from "@/domain/models/BiasCriteria";

export interface BiasCriteriaRepository {
  create(criteria: BiasCriteria): Promise<BiasCriteria>;
  update(id: EntityId, changes: Partial<BiasCriteria>): Promise<BiasCriteria>;
  delete(id: EntityId): Promise<void>;
  getById(id: EntityId): Promise<BiasCriteria | null>;
  listActive(): Promise<ReadonlyArray<BiasCriteria>>;
  listAll(): Promise<ReadonlyArray<BiasCriteria>>;
  listByLocationId(locationId: EntityId): Promise<ReadonlyArray<BiasCriteria>>;
  listByShiftTypeId(shiftTypeId: EntityId): Promise<ReadonlyArray<BiasCriteria>>;
}
```

### 9. Implement DutyLocationRepository (In-Memory)
File: `src/infrastructure/repositories/inMemory/InMemoryDutyLocationRepository.ts` (new file)

Implement the interface with in-memory storage. Follow patterns from `InMemoryDoctorRepository`.

Key behaviors:
- Generate unique IDs
- Track createdAt/updatedAt
- Return null if not found
- Filter by isActive in listActive()

### 10. Implement BiasCriteriaRepository (In-Memory)
File: `src/infrastructure/repositories/inMemory/InMemoryBiasCriteriaRepository.ts` (new file)

Implement the interface with in-memory storage.

Key behaviors:
- Generate unique IDs
- Track createdAt/updatedAt/createdByActorId/updatedByActorId
- Return null if not found
- Filter by isActive in listActive()
- Implement helper methods listByLocationId() and listByShiftTypeId()

### 11. Update RepositoryFactory
File: `src/infrastructure/repositories/RepositoryFactory.ts` (or similar factory pattern file)

Add methods to create instances:
```typescript
getDutyLocationRepository(): DutyLocationRepository
getBiasCriteriaRepository(): BiasCriteriaRepository
```

### 12. Add Repository Errors
File: `src/domain/repositories/errors.ts`

Add error classes:
```typescript
export class CriteriaInUseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CriteriaInUseError";
  }
}

export class LocationInUseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LocationInUseError";
  }
}

export class NoCriteriaDefinedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NoCriteriaDefinedError";
  }
}
```

## VERIFICATION CHECKLIST

- [ ] DayOfWeek type added to primitives
- [ ] DutyLocation model created and exported
- [ ] BiasCriteria model created and exported
- [ ] BiasLedger.balance replaced with BiasLedger.balances
- [ ] Shift model includes locationId
- [ ] ShiftDefinitionSnapshot includes locationId
- [ ] DutyLocationRepository interface defined
- [ ] BiasCriteriaRepository interface defined
- [ ] Both repositories implemented in-memory
- [ ] RepositoryFactory updated
- [ ] Error classes added
- [ ] No TypeScript errors in src/domain/ and src/infrastructure/
- [ ] All models properly exported from index.ts

## NOTES

- Do not modify business logic yet (that's Phase 3)
- Focus only on type safety and data structure
- Ensure backward compatibility in BiasLedger (optional: migrate old BiasBalance data)
- Past roster snapshots should reference old criteria unchanged
