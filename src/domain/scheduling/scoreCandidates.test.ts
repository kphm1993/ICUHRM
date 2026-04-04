import { describe, expect, it } from "vitest";
import type {
  BiasCriteria,
  BiasLedger,
  Doctor,
  DutyLocation,
  ShiftType
} from "@/domain/models";
import { DEFAULT_DUTY_LOCATION_ID } from "@/domain/models";
import { DEFAULT_SCHEDULING_ENGINE_CONFIG } from "@/domain/scheduling/config";
import {
  initializeFairnessWorkingState,
  recordAssignmentForShift
} from "@/domain/scheduling/fairnessState";
import { generateShiftPool } from "@/domain/scheduling/generateShiftPool";
import { scoreCandidates } from "@/domain/scheduling/scoreCandidates";

const NOW = "2026-04-03T08:00:00.000Z";

function createDoctor(overrides: Partial<Doctor> = {}): Doctor {
  return {
    id: overrides.id ?? "doctor-a",
    userId: overrides.userId ?? "user-a",
    name: overrides.name ?? "Doctor A",
    phoneNumber: overrides.phoneNumber ?? "0700000001",
    uniqueIdentifier: overrides.uniqueIdentifier ?? "doctor.a",
    groupId: overrides.groupId ?? "group-a",
    weekendGroup: overrides.weekendGroup ?? "A",
    isActive: overrides.isActive ?? true,
    createdAt: overrides.createdAt ?? NOW,
    updatedAt: overrides.updatedAt ?? NOW
  };
}

function createShiftType(overrides: Partial<ShiftType> = {}): ShiftType {
  return {
    id: overrides.id ?? "shift-type-day",
    code: overrides.code ?? "DAY",
    label: overrides.label ?? "Day",
    startTime: overrides.startTime ?? "08:00",
    endTime: overrides.endTime ?? "20:00",
    category: overrides.category ?? "DAY",
    isActive: overrides.isActive ?? true,
    createdAt: overrides.createdAt ?? NOW,
    updatedAt: overrides.updatedAt ?? NOW
  };
}

function createDutyLocation(overrides: Partial<DutyLocation> = {}): DutyLocation {
  return {
    id: overrides.id ?? DEFAULT_DUTY_LOCATION_ID,
    code: overrides.code ?? "CCU",
    label: overrides.label ?? "Cardiac Care Unit",
    description: overrides.description,
    isActive: overrides.isActive ?? true,
    createdAt: overrides.createdAt ?? NOW,
    updatedAt: overrides.updatedAt ?? NOW
  };
}

function createCriteria(overrides: Partial<BiasCriteria> = {}): BiasCriteria {
  return {
    id: overrides.id ?? "criteria-day-all",
    code: overrides.code ?? "DAY_ALL",
    label: overrides.label ?? "All Day Shifts",
    locationIds: overrides.locationIds ?? [],
    shiftTypeIds: overrides.shiftTypeIds ?? [],
    weekdayConditions: overrides.weekdayConditions ?? [],
    isWeekendOnly: overrides.isWeekendOnly ?? false,
    isActive: overrides.isActive ?? true,
    isLocked: overrides.isLocked ?? false,
    createdAt: overrides.createdAt ?? NOW,
    updatedAt: overrides.updatedAt ?? NOW,
    createdByActorId: overrides.createdByActorId ?? "user-admin",
    updatedByActorId: overrides.updatedByActorId ?? "user-admin"
  };
}

function createBiasLedger(overrides: Partial<BiasLedger> = {}): BiasLedger {
  return {
    id: overrides.id ?? `bias-${overrides.doctorId ?? "doctor-a"}`,
    doctorId: overrides.doctorId ?? "doctor-a",
    effectiveMonth: overrides.effectiveMonth ?? "2026-05",
    balances: overrides.balances ?? {
      "criteria-day-all": 0
    },
    source: overrides.source ?? "ROSTER_GENERATION",
    sourceReferenceId: overrides.sourceReferenceId ?? "roster-prev",
    updatedAt: overrides.updatedAt ?? NOW,
    updatedByActorId: overrides.updatedByActorId ?? "system"
  };
}

describe("scoreCandidates", () => {
  const dayShiftType = createShiftType();
  const location = createDutyLocation();
  const criteria = createCriteria({
    locationIds: [location.id],
    shiftTypeIds: [dayShiftType.id]
  });
  const doctors = [
    createDoctor(),
    createDoctor({
      id: "doctor-b",
      userId: "user-b",
      name: "Doctor B",
      phoneNumber: "0700000002",
      uniqueIdentifier: "doctor.b",
      groupId: "group-b",
      weekendGroup: "B"
    })
  ];
  const shift = generateShiftPool({
    rosterId: "roster-score-candidates",
    range: {
      startDate: "2026-05-12",
      endDate: "2026-05-12"
    },
    shiftTypes: [dayShiftType],
    dutyDesigns: [],
    dutyDesignAssignments: [],
    activeDutyLocations: [location],
    fallbackLocationId: location.id,
    weekendGroupSchedule: []
  }).shifts[0];

  if (!shift) {
    throw new Error("Expected a generated shift for scoreCandidates tests.");
  }

  it("ranks more negative carried bias ahead of more positive carried bias", () => {
    const scoredCandidates = scoreCandidates({
      shift,
      eligibility: doctors.map((doctor) => ({
        doctorId: doctor.id,
        isEligible: true,
        reasons: []
      })),
      currentBias: [
        createBiasLedger({
          doctorId: "doctor-a",
          balances: {
            [criteria.id]: 2
          }
        }),
        createBiasLedger({
          doctorId: "doctor-b",
          balances: {
            [criteria.id]: -2
          }
        })
      ],
      matchingCriteria: [criteria],
      offRequests: [],
      fairnessState: initializeFairnessWorkingState({
        doctors,
        criteriaIds: [criteria.id]
      }),
      config: DEFAULT_SCHEDULING_ENGINE_CONFIG
    });

    expect(scoredCandidates.map((candidate) => candidate.doctorId)).toEqual([
      "doctor-b",
      "doctor-a"
    ]);
    expect(scoredCandidates[0]?.breakdown.criteriaBiasScore).toBeLessThan(
      scoredCandidates[1]?.breakdown.criteriaBiasScore ?? 0
    );
  });

  it("uses current-period assigned count as a secondary balancing factor", () => {
    const fairnessState = recordAssignmentForShift(
      initializeFairnessWorkingState({
        doctors,
        criteriaIds: [criteria.id]
      }),
      "doctor-a",
      [criteria.id]
    );
    const scoredCandidates = scoreCandidates({
      shift,
      eligibility: doctors.map((doctor) => ({
        doctorId: doctor.id,
        isEligible: true,
        reasons: []
      })),
      currentBias: [
        createBiasLedger({
          doctorId: "doctor-a"
        }),
        createBiasLedger({
          doctorId: "doctor-b"
        })
      ],
      matchingCriteria: [criteria],
      offRequests: [],
      fairnessState,
      config: DEFAULT_SCHEDULING_ENGINE_CONFIG
    });

    expect(scoredCandidates.map((candidate) => candidate.doctorId)).toEqual([
      "doctor-b",
      "doctor-a"
    ]);
    expect(scoredCandidates[0]?.breakdown.criteriaAssignedLoadScore).toBeLessThan(
      scoredCandidates[1]?.breakdown.criteriaAssignedLoadScore ?? 0
    );
  });
});
