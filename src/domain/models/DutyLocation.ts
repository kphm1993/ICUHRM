import type { EntityId, ISODateTimeString } from "@/domain/models/primitives";

export const DEFAULT_DUTY_LOCATION_ID = "duty-location-ccu" as const;

export interface DutyLocation {
  readonly id: EntityId;
  readonly code: string;
  readonly label: string;
  readonly description?: string;
  readonly isActive: boolean;
  readonly createdAt: ISODateTimeString;
  readonly updatedAt: ISODateTimeString;
}
