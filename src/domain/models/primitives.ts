export type EntityId = string;
export type ISODateString = string;
export type ISODateTimeString = string;
export type TimeOfDayString = string;
export type YearMonthString = `${number}-${number}`;

export type UserRole = "ADMIN" | "DOCTOR";
export type ActorRole = UserRole | "SYSTEM";
export type UserStatus = "ACTIVE" | "SUSPENDED" | "INACTIVE";
export type WeekendGroup = "A" | "B";

export type ShiftKind = "DAY" | "NIGHT" | "CUSTOM";
export type ShiftCategory = "WEEKDAY" | "WEEKEND";
export type ShiftSpecialFlag = "NONE" | "FRIDAY_NIGHT";
export type GroupEligibility =
  | "ALL"
  | "WEEKEND_GROUP_A"
  | "WEEKEND_GROUP_B"
  | "NOT_WEEKEND_OFF_GROUP";

export type RosterStatus = "DRAFT" | "PUBLISHED" | "LOCKED";
export type AssignmentSource = "AUTO" | "ADMIN_OVERRIDE";
export type OffRequestShiftPreference = "DAY" | "NIGHT" | "FULL_DAY";
export type PriorityLevel = 1 | 2 | 3 | 4 | 5;
export type ExchangeRequestStatus =
  | "PENDING"
  | "ACCEPTED"
  | "REJECTED"
  | "CANCELLED";

