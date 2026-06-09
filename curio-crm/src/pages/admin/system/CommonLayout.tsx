import React from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { BrokerGuide } from "../../../components/admin/BrokerGuide";
import { PageHeader } from "../../../components/admin/CrmShell";

const subLinks = [
  { to: "/admin/system/common/countries", label: "Countries", live: true },
  { to: "/admin/system/common/preferences", label: "Preferences", live: true },
  { to: "/admin/system/common/release-pdf", label: "Release Pdf", live: true },
  { to: "/admin/system/common/security/view-log", label: "Security", live: true },
  { to: "/admin/system/common/branding", label: "Brand DNA", live: true },
];

export function CommonLayout() {
  const location = useLocation();
  return (
    <div>
      <PageHeader
        title="Common"
        subtitle="Countries, platform preferences, release documents, security, and white-label branding"
      />
      <BrokerGuide title="Common settings — what brokers use daily">
        <p>
          <strong>Countries</strong> controls who can visit the site, register, and trade — plus phone prefixes for
          click-to-call. <strong>Preferences</strong> sets desk defaults. <strong>Security → View Log</strong> shows who
          logged in and from where. <strong>Brand DNA</strong> is your CRM name and public site link.
        </p>
      </BrokerGuide>
      <nav className="mb-6 flex flex-wrap gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1">
        {subLinks.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            className={() => {
              const active =
                link.label === "Security"
                  ? location.pathname.includes("/admin/system/common/security")
                  : location.pathname === link.to || location.pathname.startsWith(`${link.to}/`);
              return `rounded-md px-3 py-1.5 text-xs font-medium transition ${
                active
                  ? "bg-white text-teal-700 shadow-sm ring-1 ring-slate-200"
                  : "text-slate-600 hover:bg-white/60 hover:text-slate-900"
              }`;
            }}
          >
            {link.label}
          </NavLink>
        ))}
      </nav>
      <Outlet />
    </div>
  );
}
