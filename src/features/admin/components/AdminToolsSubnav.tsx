import { NavLink } from "react-router-dom";

function getLinkClasses(isActive: boolean) {
  return [
    "inline-flex rounded-full border px-4 py-2 text-sm font-semibold transition",
    isActive
      ? "border-brand-400 bg-brand-50 text-brand-900"
      : "border-slate-300 bg-white text-slate-700 hover:border-brand-300 hover:text-brand-800"
  ].join(" ");
}

export function AdminToolsSubnav() {
  return (
    <nav
      aria-label="Admin tools sections"
      className="flex flex-wrap gap-3 rounded-3xl border border-slate-200 bg-white/90 p-4 shadow-panel"
    >
      <NavLink className={({ isActive }) => getLinkClasses(isActive)} end to="/admin">
        Admin Hub
      </NavLink>
      <NavLink className={({ isActive }) => getLinkClasses(isActive)} to="/admin/rosters">
        Rosters
      </NavLink>
      <NavLink className={({ isActive }) => getLinkClasses(isActive)} to="/admin/doctors">
        Doctors
      </NavLink>
      <NavLink
        className={({ isActive }) => getLinkClasses(isActive)}
        to="/admin/shift-types"
      >
        Shift Types
      </NavLink>
      <NavLink
        className={({ isActive }) => getLinkClasses(isActive)}
        to="/admin/duty-designs"
      >
        Duty Designs
      </NavLink>
      <NavLink
        className={({ isActive }) => getLinkClasses(isActive)}
        to="/admin/duty-design-assignments"
      >
        Duty Design Assignments
      </NavLink>
      <NavLink
        className={({ isActive }) => getLinkClasses(isActive)}
        to="/admin/locations"
      >
        Duty Locations
      </NavLink>
      <NavLink
        className={({ isActive }) => getLinkClasses(isActive)}
        to="/admin/bias-criteria"
      >
        Bias Criteria
      </NavLink>
    </nav>
  );
}
