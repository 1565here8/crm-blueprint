import React from "react";
import { NavLink, Outlet } from "react-router-dom";

const tabs = [
  { to: "/admin/system/common/security/view-log", label: "View Log", end: true },
  { to: "/admin/system/common/security/settings", label: "Session settings", end: true },
];

export function SecurityLayout() {
  return (
    <div>
      <nav className="mb-4 flex flex-wrap gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1">
        {tabs.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.end}
            className={({ isActive }) =>
              `rounded-md px-3 py-1.5 text-xs font-medium transition ${
                isActive
                  ? "bg-white text-teal-700 shadow-sm ring-1 ring-slate-200"
                  : "text-slate-600 hover:bg-white/60 hover:text-slate-900"
              }`
            }
          >
            {tab.label}
          </NavLink>
        ))}
      </nav>
      <Outlet />
    </div>
  );
}
