import React from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { ActionGuideBar, BrokerGuide } from "../../../components/admin/BrokerGuide";
import { PageHeader, Panel } from "../../../components/admin/CrmShell";
import { paymentGatewayTabGuides } from "./paymentGatewayGuides";
import { systemSectionGuides } from "./systemSectionGuides";

const labels: Record<string, string> = {
  "payment-gateways": "Payment Gateways",
  processors: "Processors",
  phpinfo: "Phpinfo",
  "platform-admin": "Platform Admin",
  "refresh-trades": "Refresh All Trades",
  feeds: "Feeds",
  "cascading-limits": "Cascading Deposit Limits",
  "cascading-items": "Cascading Deposit Items",
  configuration: "Configuration",
  "error-logs": "Error Logs",
  "smtp-logs": "SMTP Logs",
  "balance-events": "Balance events",
  "history-logs": "History Logs",
  "order-storage-logs": "Order Storage Logs",
  "super-admin": "Super Admin",
  common: "Common",
  tracking: "Tracking",
  "api-docs": "API Docs",
  oauth: "OAuth",
  permissions: "Permissions",
  groups: "Groups",
  "account-type": "Account Type",
  spread: "Spread",
  "promo-code": "Promo Code",
  "auto-assign": "Auto Assign",
  notifications: "Notifications",
  "min-max-deposits": "Min/Max Deposits",
  status: "Status",
  "dynamic-status": "Dynamic Status",
  "trading-status": "Trading Status",
  "event-logs": "Event Logs",
};

export function SystemPlaceholderPage() {
  const { section } = useParams();
  const { pathname } = useLocation();
  const nestedInPaymentGateways = pathname.includes("/payment-gateways/");
  const title = (section && labels[section]) || "System";
  const pgGuide = section ? paymentGatewayTabGuides[section] : undefined;
  const sysGuide = section ? systemSectionGuides[section] : undefined;
  const guide = pgGuide ?? sysGuide;
  const description =
    guide?.body ??
    `Manage ${title.toLowerCase()} settings for your brokerage operations. This module is on the roadmap.`;

  return (
    <div>
      {!nestedInPaymentGateways ? (
        <PageHeader title={title} subtitle="System configuration" />
      ) : null}

      {!nestedInPaymentGateways && guide ? (
        <BrokerGuide title={guide.title}>{guide.body}</BrokerGuide>
      ) : null}

      <Panel className="max-w-2xl p-6">
        {!nestedInPaymentGateways ? (
          <p className="text-sm leading-relaxed text-slate-600">{description}</p>
        ) : (
          <p className="text-sm leading-relaxed text-slate-600">
            <strong className="text-slate-800">Coming soon</strong> on this deployment. The guide above explains what
            this tab did on legacy CRMs and what to use instead today.
          </p>
        )}
        <p className="mt-4 text-sm text-slate-500">Working pages you can use right now:</p>
        <ul className="mt-3 list-inside list-disc space-y-1 text-sm text-teal-700">
          <li>
            <Link to="/admin/system/payment-gateways/test-cards" className="hover:underline">
              Test CC numbers
            </Link>
          </li>
          <li>
            <Link to="/admin/system/payment-gateways/processors" className="hover:underline">
              Processors
            </Link>
          </li>
          <li>
            <Link to="/admin/system/common" className="hover:underline">
              Brand &amp; Common
            </Link>
          </li>
          <li>
            <Link to="/admin/system/team-permissions" className="hover:underline">
              Team Permissions
            </Link>
          </li>
          <li>
            <Link to="/admin/desk/psp-health" className="hover:underline">
              Payment Radar
            </Link>
          </li>
        </ul>
      </Panel>

      <ActionGuideBar
        actions={
          guide?.actions ?? [
            {
              label: "Test CC numbers",
              help: "Sandbox merchant credentials and test card PANs for QA deposits.",
            },
            {
              label: "Processors",
              help: "Enable/disable gateways and set country + priority routing on the deposit page.",
            },
            {
              label: "Payment Radar",
              help: "Live view of stuck deposits and PSP health — use before legacy Refresh All Trades.",
            },
            {
              label: "Brand & Common",
              help: "CRM sidebar name and Go to site link for your trading front-end.",
            },
            {
              label: "Team Permissions",
              help: "Control which agents see money, clients, and payment tools.",
            },
          ]
        }
      />
    </div>
  );
}
