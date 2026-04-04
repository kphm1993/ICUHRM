import { describe, expect, it } from "vitest";
import {
  CriteriaLockedError,
  CriteriaInUseError,
  LocationInUseError,
  NoCriteriaDefinedError,
  RosterDeletionError,
  UnauthorizedError
} from "@/domain/repositories";
import { getAdminOperationErrorMessage } from "@/features/admin/services/adminOperationErrorMessage";

describe("getAdminOperationErrorMessage", () => {
  it("returns actionable guidance when no bias criteria exist", () => {
    expect(
      getAdminOperationErrorMessage(
        new NoCriteriaDefinedError("No active bias criteria defined."),
        "Fallback."
      )
    ).toContain("Admin Tools > Bias Criteria");
  });

  it("returns actionable guidance for invalid active-location configuration", () => {
    expect(
      getAdminOperationErrorMessage(
        new Error("Phase 3 roster generation requires exactly one active duty location."),
        "Fallback."
      )
    ).toContain("exactly one active duty location");
  });

  it("adds deactivation guidance for criteria-in-use errors", () => {
    expect(
      getAdminOperationErrorMessage(
        new CriteriaInUseError("Cannot delete criteria 'Weekend'."),
        "Fallback."
      )
    ).toContain("Deactivate the criteria instead");
  });

  it("returns locked-criteria guidance directly", () => {
    expect(
      getAdminOperationErrorMessage(
        new CriteriaLockedError("Bias criteria 'Weekend' is locked. Unlock it before you edit it."),
        "Fallback."
      )
    ).toBe("Bias criteria 'Weekend' is locked. Unlock it before you edit it.");
  });

  it("preserves explicit location blocking messages", () => {
    expect(
      getAdminOperationErrorMessage(
        new LocationInUseError("Cannot delete location 'CCU' because it is referenced by historical roster snapshots."),
        "Fallback."
      )
    ).toContain("historical roster snapshots");
  });

  it("returns roster deletion guidance directly", () => {
    expect(
      getAdminOperationErrorMessage(
        new RosterDeletionError("Cannot delete a locked roster. Unlock it first."),
        "Fallback."
      )
    ).toBe("Cannot delete a locked roster. Unlock it first.");
  });

  it("returns lifecycle permission guidance for unauthorized actors", () => {
    expect(
      getAdminOperationErrorMessage(
        new UnauthorizedError("Only admins can manage roster lifecycle."),
        "Fallback."
      )
    ).toBe("Only admins can manage roster lifecycle.");
  });
});
