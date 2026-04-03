# AGENT IMPLEMENTATION: Expandable Bias Criteria Cards with Doctor Bias Lists

## OBJECTIVE
Transform bias criteria cards into expandable/collapsible cards that show a sorted list of doctors with their bias values when clicked. Display from most negative bias (first) to most positive bias (last).

## SCOPE

Admin-only feature:
- Click criteria card → expands to show doctor bias list
- Click again → collapses
- Only one card expanded at a time
- Shows bias number for each doctor
- Sorted: most negative bias → most positive bias
- Mobile-responsive design

## DATA REQUIREMENTS

### New Service Method
Add to `BiasCriteriaManagementService`:

```typescript
export interface DoctorBiasSummary {
  readonly doctorId: EntityId;
  readonly doctorName: string;
  readonly doctorUniqueId: string;
  readonly biasValue: number;
  readonly isActive: boolean;
}

export interface BiasCriteriaManagementService {
  // ... existing methods ...
  
  getDoctorsByBiasForCriteria(input: {
    criteriaId: EntityId;
    currentMonth: YearMonthString;
  }): Promise<ReadonlyArray<DoctorBiasSummary>>;
}
```

**Implementation Logic:**
1. Get all active doctors
2. Get current bias ledger for the month
3. For each doctor, extract bias value for the specific criteria ID
4. Sort by bias value: negative first (ascending order)
5. Return formatted summaries

## UI COMPONENT UPDATES

### Modify BiasCriteriaList Component
File: `src/features/admin/components/BiasCriteriaList.tsx`

**Key Changes:**

1. **State Management:**
```typescript
const [expandedCriteriaId, setExpandedCriteriaId] = useState<EntityId | null>(null);
const [doctorBiasLists, setDoctorBiasLists] = useState<Record<EntityId, DoctorBiasSummary[]>>({});
const [loadingBiasLists, setLoadingBiasLists] = useState<Set<EntityId>>(new Set());
```

2. **Card Click Handler:**
```typescript
function handleCriteriaClick(criteriaId: EntityId) {
  if (expandedCriteriaId === criteriaId) {
    // Collapse if already expanded
    setExpandedCriteriaId(null);
  } else {
    // Expand new card
    setExpandedCriteriaId(criteriaId);
    loadDoctorBiasList(criteriaId);
  }
}
```

3. **Load Doctor Bias List:**
```typescript
async function loadDoctorBiasList(criteriaId: EntityId) {
  if (doctorBiasLists[criteriaId]) {
    return; // Already loaded
  }

  setLoadingBiasLists(prev => new Set(prev).add(criteriaId));
  
  try {
    const currentMonth = new Date().toISOString().slice(0, 7) as YearMonthString;
    const doctors = await biasCriteriaManagementService.getDoctorsByBiasForCriteria({
      criteriaId,
      currentMonth
    });
    setDoctorBiasLists(prev => ({ ...prev, [criteriaId]: doctors }));
  } catch (error) {
    console.error('Failed to load doctor bias list:', error);
    // Show error toast
  } finally {
    setLoadingBiasLists(prev => {
      const next = new Set(prev);
      next.delete(criteriaId);
      return next;
    });
  }
}
```

4. **Card Structure (Expandable):**
```typescript
{props.criteriaEntries.map((criteria) => {
  const isExpanded = expandedCriteriaId === criteria.id;
  const doctorList = doctorBiasLists[criteria.id] || [];
  const isLoadingList = loadingBiasLists.has(criteria.id);
  
  return (
    <div key={criteria.id} className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      {/* Header - Clickable */}
      <button
        className="w-full px-4 py-4 text-left hover:bg-slate-50 transition"
        onClick={() => handleCriteriaClick(criteria.id)}
        type="button"
      >
        {/* Existing header content */}
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h3 className="text-base font-semibold text-slate-900">
              {criteria.label}
            </h3>
            <p className="mt-1 text-sm text-slate-600">{criteria.code}</p>
            <p className="mt-2 text-sm text-slate-500">
              {summarizeBiasCriteria(criteria, {
                locations: props.locations,
                shiftTypes: props.shiftTypes
              })}
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Status badges */}
            <div className="flex flex-wrap gap-2">
              <span className={getStatusClasses(criteria.isActive)}>
                {criteria.isActive ? "Active" : "Inactive"}
              </span>
              {criteria.isWeekendOnly ? (
                <span className="bg-white text-brand-800">Weekend Only</span>
              ) : null}
            </div>
            
            {/* Expand/collapse icon */}
            <ChevronDownIcon 
              className={`h-5 w-5 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            />
          </div>
        </div>
      </button>
      
      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t border-slate-200 bg-slate-50/50">
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-slate-900">
                Doctor Bias Rankings
              </h4>
              <span className="text-xs text-slate-500">
                {doctorList.length} doctors
              </span>
            </div>
            
            {isLoadingList ? (
              <div className="py-4 text-center text-sm text-slate-600">
                Loading doctor bias data...
              </div>
            ) : doctorList.length === 0 ? (
              <div className="py-4 text-center text-sm text-slate-500">
                No bias data available for this criteria
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {doctorList.map((doctor, index) => (
                  <div 
                    key={doctor.doctorId}
                    className="flex items-center justify-between py-2 px-3 rounded-lg bg-white border border-slate-200"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-mono text-slate-500 w-6">
                        #{index + 1}
                      </span>
                      <div>
                        <div className="text-sm font-medium text-slate-900">
                          {doctor.doctorName}
                        </div>
                        <div className="text-xs text-slate-500">
                          {doctor.doctorUniqueId}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {!doctor.isActive && (
                        <span className="text-xs px-2 py-1 rounded bg-slate-100 text-slate-600">
                          Inactive
                        </span>
                      )}
                      <div className={`text-sm font-mono px-2 py-1 rounded ${
                        doctor.biasValue < 0 
                          ? 'bg-emerald-100 text-emerald-800' 
                          : doctor.biasValue > 0 
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-slate-100 text-slate-700'
                      }`}>
                        {doctor.biasValue > 0 ? '+' : ''}{doctor.biasValue}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            <div className="mt-3 pt-3 border-t border-slate-200">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Sorted: Most negative bias → Most positive bias</span>
                <span>Green = Under-assigned | Red = Over-assigned</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
})}
```

## SERVICE IMPLEMENTATION

### Add Method to BiasCriteriaManagementService
File: `src/features/admin/services/biasCriteriaManagementService.ts`

```typescript
export interface DoctorBiasSummary {
  readonly doctorId: EntityId;
  readonly doctorName: string;
  readonly doctorUniqueId: string;
  readonly biasValue: number;
  readonly isActive: boolean;
}

export class BiasCriteriaManagementService {
  // ... existing methods ...
  
  async getDoctorsByBiasForCriteria(input: {
    criteriaId: EntityId;
    currentMonth: YearMonthString;
  }): Promise<ReadonlyArray<DoctorBiasSummary>> {
    // 1. Get all doctors (active and inactive)
    const doctors = await this.doctorManagementService.listDoctors();
    
    // 2. Get current bias ledger for the month
    const biasLedgers = await this.biasLedgerRepository.listByEffectiveMonth(input.currentMonth);
    
    // 3. Build doctor bias summaries
    const summaries = doctors.map(doctor => {
      const doctorBias = biasLedgers.find(ledger => ledger.doctorId === doctor.id);
      const biasValue = doctorBias?.balances[input.criteriaId] ?? 0;
      
      return {
        doctorId: doctor.id,
        doctorName: doctor.name,
        doctorUniqueId: doctor.uniqueIdentifier,
        biasValue,
        isActive: doctor.isActive
      };
    });
    
    // 4. Sort by bias value: negative first (ascending)
    return summaries.sort((a, b) => a.biasValue - b.biasValue);
  }
}
```

## UI/UX REQUIREMENTS

### Visual Design
- **Card States**: Normal, hover, expanded
- **Bias Colors**: 
  - Negative (green): Under-assigned
  - Zero (gray): Fair
  - Positive (red): Over-assigned
- **Loading State**: Skeleton or spinner while loading doctor list
- **Empty State**: Message when no bias data available

### Mobile Responsiveness
- Cards stack vertically on mobile
- Doctor list scrolls horizontally if needed
- Touch-friendly expand/collapse
- Readable text sizes

### Accessibility
- Keyboard navigation (Enter/Space to expand)
- Screen reader support for expanded content
- ARIA labels for expand/collapse state
- Focus management when expanding/collapsing

## ERROR HANDLING

### Service Errors
- Network failure: Show toast "Failed to load doctor bias data"
- Repository error: Log and show generic error
- Invalid criteria ID: Should not happen (UI validation)

### UI Error States
- Loading timeout: Show retry button
- Partial load failure: Show partial data with warning
- No data: Clear message "No bias data available"

## PERFORMANCE CONSIDERATIONS

### Lazy Loading
- Only load doctor bias list when card is first expanded
- Cache loaded lists in component state
- Don't reload if already loaded

### Data Limits
- Limit doctor list height (max-h-64 with scroll)
- Show "X doctors" count
- Consider pagination if >50 doctors

### Memory Management
- Clear expanded state when component unmounts
- Don't keep unnecessary data in state

## VERIFICATION CHECKLIST

- [ ] Cards expand/collapse on click
- [ ] Only one card expanded at a time
- [ ] Doctor list loads on first expand
- [ ] Sorting: negative bias first, positive last
- [ ] Bias values display with +/- signs
- [ ] Color coding: green negative, red positive, gray zero
- [ ] Inactive doctors marked clearly
- [ ] Loading states work properly
- [ ] Error handling for failed loads
- [ ] Mobile responsive layout
- [ ] Keyboard accessibility
- [ ] Performance: lazy loading, caching
- [ ] No TypeScript errors
- [ ] Service method returns correct data structure

## NOTES

- Bias values are for the **current month** only
- Sorting is ascending (negative → positive) because lower bias = higher priority
- Green negative values are "good" (will get priority)
- Red positive values are "bad" (have been over-assigned)
- Component should handle doctors with no bias data (shows 0)
- Consider adding refresh button for real-time bias updates

---

**This prompt is ready for agent implementation. Proceed when ready.**
