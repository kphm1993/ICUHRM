import {
  CriteriaLockedError,
  CriteriaInUseError,
  LocationInUseError,
  NoCriteriaDefinedError,
  RosterDeletionError,
  UnauthorizedError
} from "@/domain/repositories";

const EXACTLY_ONE_ACTIVE_LOCATION_MESSAGE =
  "Phase 3 roster generation requires exactly one active duty location.";

function getPhase3LocationGuidance(): string {
  return "Roster generation currently supports exactly one active duty location. Leave one active location enabled in Admin Tools > Duty Locations, then try again.";
}

export function getAdminOperationErrorMessage(
  error: unknown,
  fallbackMessage: string
): string {
  if (error instanceof NoCriteriaDefinedError) {
    return "Cannot generate roster because no active bias criteria are defined. Create at least one active criteria record in Admin Tools > Bias Criteria, then try again.";
  }

  if (error instanceof LocationInUseError) {
    if (error.message.includes("default duty location")) {
      return `${error.message} ${getPhase3LocationGuidance()}`;
    }

    return error.message;
  }

  if (error instanceof CriteriaInUseError) {
    return `${error.message} Deactivate the criteria instead if you only want to stop future tracking.`;
  }

  if (error instanceof CriteriaLockedError) {
    return error.message;
  }

  if (error instanceof RosterDeletionError) {
    return error.message;
  }

  if (error instanceof UnauthorizedError) {
    return "You do not have permission to manage roster lifecycle.";
  }

  if (!(error instanceof Error)) {
    return fallbackMessage;
  }

  if (error.message === EXACTLY_ONE_ACTIVE_LOCATION_MESSAGE) {
    return getPhase3LocationGuidance();
  }

  if (
    error.message.includes("references duty location") ||
    error.message.includes("references shift type")
  ) {
    return `${error.message} Review Admin Tools > Bias Criteria and your active shift/location configuration, then try again.`;
  }

  if (error.message.includes("Generation location")) {
    return `${error.message} Review the active duty location configuration, then try again.`;
  }

  return error.message;
}
