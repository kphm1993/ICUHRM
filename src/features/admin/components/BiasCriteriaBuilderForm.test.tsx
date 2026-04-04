import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import type { DayOfWeek } from "@/domain/models";
import { BiasCriteriaBuilderForm } from "@/features/admin/components/BiasCriteriaBuilderForm";
import { buildBiasCriteriaPreview } from "@/features/admin/services/biasCriteriaPreview";

function BiasCriteriaBuilderFormHarness() {
  const [values, setValues] = useState({
    code: "WEEKEND_RULE",
    label: "Weekend Rule",
    locationIds: [] as ReadonlyArray<string>,
    shiftTypeIds: [] as ReadonlyArray<string>,
    weekdayConditions: [] as ReadonlyArray<DayOfWeek>,
    isWeekendOnly: false
  });

  const locations = [
    {
      id: "location-ccu",
      code: "CCU",
      label: "Cardiac Care Unit",
      description: "Main unit",
      isActive: true,
      createdAt: "2026-04-03T08:00:00.000Z",
      updatedAt: "2026-04-03T08:00:00.000Z"
    }
  ];
  const shiftTypes = [
    {
      id: "shift-type-day",
      code: "DAY",
      label: "Day",
      startTime: "08:00",
      endTime: "20:00",
      category: "DAY" as const,
      isActive: true,
      createdAt: "2026-04-03T08:00:00.000Z",
      updatedAt: "2026-04-03T08:00:00.000Z"
    }
  ];

  return (
    <BiasCriteriaBuilderForm
      activeAction={null}
      criteria={null}
      fieldErrors={{}}
      locations={locations}
      mode="create"
      onCancel={() => undefined}
      onDelete={() => undefined}
      onSetWeekdays={(days) =>
        setValues((currentValues) => ({
          ...currentValues,
          weekdayConditions: days
        }))
      }
      onSetWeekendOnly={(isWeekendOnly) =>
        setValues((currentValues) => ({
          ...currentValues,
          isWeekendOnly
        }))
      }
      onSubmit={() => undefined}
      onTextChange={(field, value) =>
        setValues((currentValues) => ({
          ...currentValues,
          [field]: value
        }))
      }
      onToggleLock={() => undefined}
      onToggleLocation={(locationId) =>
        setValues((currentValues) => ({
          ...currentValues,
          locationIds: currentValues.locationIds.includes(locationId)
            ? currentValues.locationIds.filter((entry) => entry !== locationId)
            : [...currentValues.locationIds, locationId]
        }))
      }
      onToggleShiftType={(shiftTypeId) =>
        setValues((currentValues) => ({
          ...currentValues,
          shiftTypeIds: currentValues.shiftTypeIds.includes(shiftTypeId)
            ? currentValues.shiftTypeIds.filter((entry) => entry !== shiftTypeId)
            : [...currentValues.shiftTypeIds, shiftTypeId]
        }))
      }
      onToggleStatus={() => undefined}
      onToggleWeekday={(day) =>
        setValues((currentValues) => ({
          ...currentValues,
          weekdayConditions: currentValues.weekdayConditions.includes(day)
            ? currentValues.weekdayConditions.filter((entry) => entry !== day)
            : [...currentValues.weekdayConditions, day]
        }))
      }
      previewText={buildBiasCriteriaPreview(values, {
        locations,
        shiftTypes
      })}
      shiftTypes={shiftTypes}
      values={values}
    />
  );
}

describe("BiasCriteriaBuilderForm", () => {
  it("updates the preview text deterministically when weekday quick actions change", async () => {
    const user = userEvent.setup();

    render(<BiasCriteriaBuilderFormHarness />);

    expect(screen.getByText("all locations; all shift types; all days.")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Weekends" }));

    expect(screen.getByText("all locations; all shift types; weekends.")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "All Days" }));

    expect(screen.getByText("all locations; all shift types; all days.")).toBeInTheDocument();
  });

  it("disables editing controls when the selected criteria is locked", () => {
    const lockedCriteria = {
      id: "criteria-locked",
      code: "LOCKED_RULE",
      label: "Locked Rule",
      locationIds: [] as ReadonlyArray<string>,
      shiftTypeIds: [] as ReadonlyArray<string>,
      weekdayConditions: [] as ReadonlyArray<DayOfWeek>,
      isWeekendOnly: false,
      isActive: true,
      isLocked: true,
      lockedAt: "2026-04-03T08:00:00.000Z",
      lockedByActorId: "user-admin-demo",
      createdAt: "2026-04-03T08:00:00.000Z",
      updatedAt: "2026-04-03T08:00:00.000Z",
      createdByActorId: "user-admin-demo",
      updatedByActorId: "user-admin-demo"
    };
    const locations = [
      {
        id: "location-ccu",
        code: "CCU",
        label: "Cardiac Care Unit",
        description: "Main unit",
        isActive: true,
        createdAt: "2026-04-03T08:00:00.000Z",
        updatedAt: "2026-04-03T08:00:00.000Z"
      }
    ];
    const shiftTypes = [
      {
        id: "shift-type-day",
        code: "DAY",
        label: "Day",
        startTime: "08:00",
        endTime: "20:00",
        category: "DAY" as const,
        isActive: true,
        createdAt: "2026-04-03T08:00:00.000Z",
        updatedAt: "2026-04-03T08:00:00.000Z"
      }
    ];

    render(
      <BiasCriteriaBuilderForm
        activeAction={null}
        criteria={lockedCriteria}
        fieldErrors={{}}
        locations={locations}
        mode="edit"
        onCancel={() => undefined}
        onDelete={() => undefined}
        onSetWeekdays={() => undefined}
        onSetWeekendOnly={() => undefined}
        onSubmit={() => undefined}
        onTextChange={() => undefined}
        onToggleLock={() => undefined}
        onToggleLocation={() => undefined}
        onToggleShiftType={() => undefined}
        onToggleStatus={() => undefined}
        onToggleWeekday={() => undefined}
        previewText={buildBiasCriteriaPreview(lockedCriteria, {
          locations,
          shiftTypes
        })}
        shiftTypes={shiftTypes}
        values={{
          code: lockedCriteria.code,
          label: lockedCriteria.label,
          locationIds: [],
          shiftTypeIds: [],
          weekdayConditions: [],
          isWeekendOnly: false
        }}
      />
    );

    expect(
      screen.getByText(
        "This criteria is locked. Unlock it before editing the rule, changing its active status, or deleting it."
      )
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Code")).toBeDisabled();
    expect(screen.getByLabelText("Label")).toBeDisabled();
    expect(screen.getByRole("button", { name: "Save Changes" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Deactivate" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Delete" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Unlock Criteria" })).toBeEnabled();
  });
});
