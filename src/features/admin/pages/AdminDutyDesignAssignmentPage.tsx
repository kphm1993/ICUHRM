import { AdminToolsSubnav } from "@/features/admin/components/AdminToolsSubnav";
import { DutyDesignAssignmentCalendar } from "@/features/admin/components/DutyDesignAssignmentCalendar";
import { DutyDesignAssignmentToolbar } from "@/features/admin/components/DutyDesignAssignmentToolbar";
import { useDutyDesignAssignments } from "@/features/admin/hooks/useDutyDesignAssignments";

export function AdminDutyDesignAssignmentPage() {
  const assignmentManagement = useDutyDesignAssignments();

  return (
    <section className="space-y-6">
      <header className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-panel">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-brand-700">
          Admin
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">
          Duty Design Assignments
        </h1>
        <p className="mt-3 max-w-3xl text-sm text-slate-600 sm:text-base">
          Assign one or more active duty designs to selected calendar dates with a
          lightweight month-grid workflow and explicit holiday override handling.
        </p>
      </header>

      <AdminToolsSubnav />

      {assignmentManagement.errorMessage ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
          {assignmentManagement.errorMessage}
        </div>
      ) : null}

      {assignmentManagement.successMessage ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          {assignmentManagement.successMessage}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <DutyDesignAssignmentCalendar
          isLoading={assignmentManagement.isLoading}
          onToggleDate={assignmentManagement.toggleSelectedDate}
          onUnassignDutyDesign={assignmentManagement.unassignDutyDesign}
          weeks={assignmentManagement.calendarWeeks}
        />

        <DutyDesignAssignmentToolbar
          activeAction={assignmentManagement.activeAction}
          activeDutyDesignOptions={assignmentManagement.activeDutyDesignOptions}
          isHolidayOverride={assignmentManagement.isHolidayOverride}
          month={assignmentManagement.month}
          onAssignSelectedDates={assignmentManagement.assignSelectedDates}
          onClearSelectedDates={assignmentManagement.clearSelectedDates}
          onSetIsHolidayOverride={assignmentManagement.setIsHolidayOverride}
          onSetMonth={assignmentManagement.setVisibleMonth}
          onSetSelectedDutyDesignId={assignmentManagement.setSelectedDutyDesignId}
          selectedDates={assignmentManagement.selectedDates}
          selectedDutyDesignId={assignmentManagement.selectedDutyDesignId}
        />
      </div>
    </section>
  );
}
