import type {
  AuditLog,
  BiasLedger,
  Doctor,
  Leave,
  OffRequest,
  RosterSnapshot,
  ShiftType,
  WeekdayPairBiasLedger,
  YearMonthString
} from "@/domain/models";

const CURRENT_ROSTER_MONTH = "2026-04" as YearMonthString;
const NOW = "2026-04-01T08:00:00.000Z";

export const ROSTER_SEED_DOCTORS: ReadonlyArray<Doctor> = [
  {
    id: "doctor-demo",
    userId: "user-doctor-demo",
    name: "Dr. Nila Perera",
    phoneNumber: "0710000001",
    uniqueIdentifier: "nila.perera",
    weekendGroup: "A",
    isActive: true,
    createdAt: NOW,
    updatedAt: NOW
  },
  {
    id: "doctor-kumara",
    userId: "user-doctor-kumara",
    name: "Dr. Anjana Kumara",
    phoneNumber: "0710000002",
    uniqueIdentifier: "anjana.kumara",
    weekendGroup: "B",
    isActive: true,
    createdAt: NOW,
    updatedAt: NOW
  },
  {
    id: "doctor-fonseka",
    userId: "user-doctor-fonseka",
    name: "Dr. Minali Fonseka",
    phoneNumber: "0710000003",
    uniqueIdentifier: "minali.fonseka",
    weekendGroup: "A",
    isActive: true,
    createdAt: NOW,
    updatedAt: NOW
  },
  {
    id: "doctor-jayasena",
    userId: "user-doctor-jayasena",
    name: "Dr. Ruwan Jayasena",
    phoneNumber: "0710000004",
    uniqueIdentifier: "ruwan.jayasena",
    weekendGroup: "B",
    isActive: true,
    createdAt: NOW,
    updatedAt: NOW
  },
  {
    id: "doctor-fernando",
    userId: "user-doctor-fernando",
    name: "Dr. Ishara Fernando",
    phoneNumber: "0710000005",
    uniqueIdentifier: "ishara.fernando",
    weekendGroup: "A",
    isActive: false,
    createdAt: NOW,
    updatedAt: NOW
  }
];

export const ROSTER_SEED_SHIFT_TYPES: ReadonlyArray<ShiftType> = [
  {
    id: "shift-type-day",
    code: "DAY",
    label: "Day",
    startTime: "08:00",
    endTime: "20:00",
    defaultKind: "DAY",
    isActive: true,
    createdAt: NOW,
    updatedAt: NOW
  },
  {
    id: "shift-type-night",
    code: "NIGHT",
    label: "Night",
    startTime: "20:00",
    endTime: "08:00",
    defaultKind: "NIGHT",
    isActive: true,
    createdAt: NOW,
    updatedAt: NOW
  }
];

export const ROSTER_SEED_LEAVES: ReadonlyArray<Leave> = [
  {
    id: "leave-kumara-april",
    doctorId: "doctor-kumara",
    startDate: "2026-04-09",
    endDate: "2026-04-10",
    reason: "Conference leave",
    createdByUserId: "user-admin-demo",
    createdAt: NOW,
    updatedAt: NOW
  },
  {
    id: "leave-demo-april",
    doctorId: "doctor-demo",
    startDate: "2026-04-15",
    endDate: "2026-04-15",
    reason: "Personal leave",
    createdByUserId: "user-admin-demo",
    createdAt: NOW,
    updatedAt: NOW
  }
];

export const ROSTER_SEED_OFF_REQUESTS: ReadonlyArray<OffRequest> = [
  {
    id: "off-request-demo-day",
    doctorId: "doctor-demo",
    rosterMonth: CURRENT_ROSTER_MONTH,
    date: "2026-04-08",
    shiftPreference: "DAY",
    priority: 2,
    requestedAt: "2026-03-24T09:15:00.000Z",
    createdAt: "2026-03-24T09:15:00.000Z",
    updatedAt: "2026-03-24T09:15:00.000Z"
  },
  {
    id: "off-request-fonseka-night",
    doctorId: "doctor-fonseka",
    rosterMonth: CURRENT_ROSTER_MONTH,
    date: "2026-04-14",
    shiftPreference: "NIGHT",
    priority: 1,
    requestedAt: "2026-03-22T10:45:00.000Z",
    createdAt: "2026-03-22T10:45:00.000Z",
    updatedAt: "2026-03-22T10:45:00.000Z"
  },
  {
    id: "off-request-jayasena-full-day",
    doctorId: "doctor-jayasena",
    rosterMonth: CURRENT_ROSTER_MONTH,
    date: "2026-04-21",
    shiftPreference: "FULL_DAY",
    priority: 3,
    requestedAt: "2026-03-23T08:30:00.000Z",
    createdAt: "2026-03-23T08:30:00.000Z",
    updatedAt: "2026-03-23T08:30:00.000Z"
  }
];

export const ROSTER_SEED_BIAS_LEDGERS: ReadonlyArray<BiasLedger> = [
  {
    id: "bias-demo-april",
    doctorId: "doctor-demo",
    effectiveMonth: CURRENT_ROSTER_MONTH,
    balance: {
      weekdayDay: -1,
      weekdayNight: 0,
      weekendDay: 0,
      weekendNight: 1
    },
    source: "ROSTER_GENERATION",
    sourceReferenceId: "seed-roster-march",
    updatedAt: NOW,
    updatedByActorId: "system"
  },
  {
    id: "bias-kumara-april",
    doctorId: "doctor-kumara",
    effectiveMonth: CURRENT_ROSTER_MONTH,
    balance: {
      weekdayDay: 1,
      weekdayNight: -1,
      weekendDay: 0,
      weekendNight: 0
    },
    source: "ROSTER_GENERATION",
    sourceReferenceId: "seed-roster-march",
    updatedAt: NOW,
    updatedByActorId: "system"
  },
  {
    id: "bias-fonseka-april",
    doctorId: "doctor-fonseka",
    effectiveMonth: CURRENT_ROSTER_MONTH,
    balance: {
      weekdayDay: 0,
      weekdayNight: 1,
      weekendDay: -1,
      weekendNight: 0
    },
    source: "ROSTER_GENERATION",
    sourceReferenceId: "seed-roster-march",
    updatedAt: NOW,
    updatedByActorId: "system"
  },
  {
    id: "bias-jayasena-april",
    doctorId: "doctor-jayasena",
    effectiveMonth: CURRENT_ROSTER_MONTH,
    balance: {
      weekdayDay: 0,
      weekdayNight: 0,
      weekendDay: 1,
      weekendNight: -1
    },
    source: "ROSTER_GENERATION",
    sourceReferenceId: "seed-roster-march",
    updatedAt: NOW,
    updatedByActorId: "system"
  }
];

export const ROSTER_SEED_WEEKDAY_PAIR_BIAS_LEDGERS: ReadonlyArray<WeekdayPairBiasLedger> =
  [
    {
      id: "pair-bias-demo-april",
      doctorId: "doctor-demo",
      effectiveMonth: CURRENT_ROSTER_MONTH,
      balance: {
        mondayDay: -1,
        mondayNight: 0,
        tuesdayDay: 0,
        tuesdayNight: 0,
        wednesdayDay: 0,
        wednesdayNight: 1,
        thursdayDay: 0,
        thursdayNight: 0,
        fridayDay: 0,
        fridayNight: 0
      },
      source: "ROSTER_GENERATION",
      sourceReferenceId: "seed-roster-march",
      updatedAt: NOW,
      updatedByActorId: "system"
    },
    {
      id: "pair-bias-kumara-april",
      doctorId: "doctor-kumara",
      effectiveMonth: CURRENT_ROSTER_MONTH,
      balance: {
        mondayDay: 0,
        mondayNight: 1,
        tuesdayDay: -1,
        tuesdayNight: 0,
        wednesdayDay: 0,
        wednesdayNight: 0,
        thursdayDay: 0,
        thursdayNight: 0,
        fridayDay: 0,
        fridayNight: 0
      },
      source: "ROSTER_GENERATION",
      sourceReferenceId: "seed-roster-march",
      updatedAt: NOW,
      updatedByActorId: "system"
    },
    {
      id: "pair-bias-fonseka-april",
      doctorId: "doctor-fonseka",
      effectiveMonth: CURRENT_ROSTER_MONTH,
      balance: {
        mondayDay: 0,
        mondayNight: 0,
        tuesdayDay: 0,
        tuesdayNight: 1,
        wednesdayDay: 0,
        wednesdayNight: 0,
        thursdayDay: -1,
        thursdayNight: 0,
        fridayDay: 0,
        fridayNight: 0
      },
      source: "ROSTER_GENERATION",
      sourceReferenceId: "seed-roster-march",
      updatedAt: NOW,
      updatedByActorId: "system"
    },
    {
      id: "pair-bias-jayasena-april",
      doctorId: "doctor-jayasena",
      effectiveMonth: CURRENT_ROSTER_MONTH,
      balance: {
        mondayDay: 0,
        mondayNight: 0,
        tuesdayDay: 0,
        tuesdayNight: 0,
        wednesdayDay: 1,
        wednesdayNight: 0,
        thursdayDay: 0,
        thursdayNight: 0,
        fridayDay: -1,
        fridayNight: 0
      },
      source: "ROSTER_GENERATION",
      sourceReferenceId: "seed-roster-march",
      updatedAt: NOW,
      updatedByActorId: "system"
    }
  ];

export const ROSTER_SEED_AUDIT_LOGS: ReadonlyArray<AuditLog> = [];
export const ROSTER_SEED_ROSTER_SNAPSHOTS: ReadonlyArray<RosterSnapshot> = [];
