import React from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { BrokerGuide } from "../../../components/admin/BrokerGuide";
import { PageHeader } from "../../../components/admin/CrmShell";
import { paymentGatewayTabGuides } from "./paymentGatewayGuides";

const subLinks = [
  { to: "/admin/system/payment-gateways/test-cards", slug: "test-cards", label: "Test CC numbers", live: true },
  { to: "/admin/system/payment-gateways/processors", slug: "processors", label: "Processors", live: true },
  { to: "/admin/system/payment-gateways/phpinfo", slug: "phpinfo", label: "Phpinfo", live: false },
  { to: "/admin/system/payment-gateways/platform-admin", slug: "platform-admin", label: "Platform Admin", live: false },
  { to: "/admin/system/payment-gateways/refresh-trades", slug: "refresh-trades", label: "Refresh All Trades", live: false },
  { to: "/admin/system/payment-gateways/feeds", slug: "feeds", label: "Feeds", live: false },
  {
    to: "/admin/system/payment-gateways/cascading-limits",
    slug: "cascading-limits",
    label: "Cascading Deposit Limits",
    live: false,
  },
  {
    to: "/admin/system/payment-gateways/cascading-items",
    slug: "cascading-items",
    label: "Cascading Deposit Items",
    live: false,
  },
];

export function PaymentGatewaysLayout() {
  const { pathname } = useLocation();
  const activeSlug = subLinks.find((l) => pathname.startsWith(l.to))?.slug;
  const tabGuide = activeSlug ? paymentGatewayTabGuides[activeSlug] : null;
  const showTabGuide =
    tabGuide && activeSlug !== "test-cards" && activeSlug !== "processors";

  return (
    <div className="p-4">
      <PageHeader
        title="Payment Gateways"
        subtitle="PSP credentials, sandbox cards, processor routing, and deposit-rail configuration"
      />

      <BrokerGuide title="How Payment Gateways work on your desk">
        <p>
          <strong>Test CC numbers</strong> holds merchant IDs and sandbox cards for QA.{" "}
          <strong>Processors</strong> decides which gateway a client sees, in what order, and for which countries.
          Everything else in this menu is either advanced routing (cascading) or legacy tools from older PHP CRMs.
        </p>
        <p className="mt-2">
          Live stuck deposits? Skip Phpinfo — open <strong>Pulse → Payment Radar</strong> first.
        </p>
      </BrokerGuide>

      <nav className="mb-6 flex flex-wrap gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1">
        {subLinks.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) =>
              `rounded-md px-3 py-1.5 text-xs font-medium transition ${
                isActive
                  ? "bg-white text-teal-700 shadow-sm ring-1 ring-slate-200"
                  : "text-slate-600 hover:bg-white/60 hover:text-slate-900"
              }`
            }
          >
            {link.label}
            {!link.live ? <span className="ml-1 text-[9px] text-slate-400">· soon</span> : null}
          </NavLink>
        ))}
      </nav>

      {showTabGuide ? <BrokerGuide title={tabGuide.title}>{tabGuide.body}</BrokerGuide> : null}

      <Outlet />
    </div>
  );
}
