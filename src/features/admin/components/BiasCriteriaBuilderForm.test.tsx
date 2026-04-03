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
      defaultKind: "DAY" as const,
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
});
