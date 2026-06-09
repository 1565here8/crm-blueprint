import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { BrandingProvider } from "./context/BrandingContext";
import { OnlineVisitorsPage } from "./pages/admin/online/OnlineVisitorsPage";
import { SystemPlaceholderPage } from "./pages/admin/system/SystemPlaceholderPage";
import { TrackPixelsPage } from "./pages/admin/system/TrackPixelsPage";
import { EventLogsPage } from "./pages/admin/system/EventLogsPage";
import {
  SuperAdminBalanceEventsPage,
  SuperAdminConfigurationPage,
  SuperAdminErrorLogsPage,
  SuperAdminHistoryLogsPage,
  SuperAdminIndexRedirect,
  SuperAdminLayout,
  SuperAdminOrderStorageLogsPage,
  SuperAdminSmtpLogsPage,
} from "./pages/admin/system/SuperAdminPages";
import { PaymentGatewaysLayout } from "./pages/admin/system/PaymentGatewaysLayout";
import { ProcessorsPage } from "./pages/admin/system/ProcessorsPage";
import { TestCreditCardsPage } from "./pages/admin/system/TestCreditCardsPage";
import { AdminLayout } from "./components/admin/AdminLayout";
import { CommissionPage } from "./pages/admin/system/CommissionPage";
import { CryptoCommissionsPage } from "./pages/admin/system/CryptoCommissionsPage";
import { ForexCommissionsPage } from "./pages/admin/system/ForexCommissionsPage";
import { SpreadPage } from "./pages/admin/system/SpreadPage";
import { CommonSettingsPage } from "./pages/admin/system/CommonSettingsPage";
import { CommonLayout } from "./pages/admin/system/CommonLayout";
import { CountriesPage } from "./pages/admin/system/CountriesPage";
import { CommonReleasePdfPage } from "./pages/admin/system/CommonSectionPages";
import { SecurityLayout } from "./pages/admin/system/SecurityLayout";
import { PreferencesPage } from "./pages/admin/system/PreferencesPage";
import { OAuthClientsPage } from "./pages/admin/system/OAuthClientsPage";
import { AccountTypesPage } from "./pages/admin/system/AccountTypesPage";
import { ClientStatusesPage } from "./pages/admin/system/ClientStatusesPage";
import { AutoAssignPage } from "./pages/admin/system/AutoAssignPage";
import { PromoCodesPage } from "./pages/admin/system/PromoCodesPage";
import { DepositLimitsPage } from "./pages/admin/system/DepositLimitsPage";
import NotificationsPage from "./pages/admin/system/NotificationsPage";
import { SettingsPage } from "./pages/admin/system/SettingsPage";
import { ApiDocsPage } from "./pages/admin/system/ApiDocsPage";
import { DynamicStatusPage } from "./pages/admin/system/DynamicStatusPage";
import { TradingStatusPage } from "./pages/admin/system/TradingStatusPage";
import { UsersPage } from "./pages/admin/crm/UsersPage";
import { UserProfilePage } from "./pages/admin/crm/UserProfilePage";
import {
  AgentsPage,
  CalendarPage,
  DepositorsPage,
  EmailsPage,
  NotesPage,
  SalesReportPage,
} from "./pages/admin/crm/CrmListPages";
import { OpenTradesPage } from "./pages/admin/trading/OpenTradesPage";
import { TradesPage } from "./pages/admin/trading/TradesPage";
import { ActivityHoursPage, AssetsPage, NetPositionsPage } from "./pages/admin/trading/TradingAdminPages";
import { DashboardPage } from "./pages/admin/DashboardPage";
import { DeskPage } from "./pages/admin/desk/DeskPage";
import { KnowmePage } from "./pages/admin/knowme/KnowmePage";
import LeadInboxPage from "./pages/admin/desk/LeadInboxPage";
import PspHealthPage from "./pages/admin/desk/PspHealthPage";
import TasksPage from "./pages/admin/desk/TasksPage";
import GroupsPage from "./pages/admin/system/GroupsPage";
import DesksPage from "./pages/admin/system/DesksPage";
import PermissionsPage from "./pages/admin/system/PermissionsPage";
import TeamPermissionsPage from "./pages/admin/system/TeamPermissionsPage";
import { CashierLedgerPage } from "./pages/admin/cashier/CashierLedgerPage";
import { WireReqPage } from "./pages/admin/cashier/WireReqPage";
import { DepositRequestsPage } from "./pages/admin/cashier/DepositRequestsPage";
import {
  MarketingApiKeysPage,
  MarketingCampaignsPage,
  MarketingPartnersPage,
  MarketingPlaceholderPage,
  MarketingTrackersPage,
} from "./pages/admin/marketing/MarketingPages";
import { PartnersHqPage } from "./pages/admin/marketing/PartnersHqPage";
import { AutomationStudioPage } from "./pages/admin/automation/AutomationStudioPage";
import { IntegrationsHubPage } from "./pages/admin/integrations/IntegrationsHubPage";
import { MetaTraderHubPage } from "./pages/admin/integrations/MetaTraderHubPage";
import { BrokerOsPage } from "./pages/admin/system/BrokerOsPage";
import { SupportDeskPage } from "./pages/admin/crm/SupportDeskPage";
import { CommsCenterPage } from "./pages/admin/crm/CommsCenterPage";
import {
  SecurityAccessSettingsPage,
  SecurityAuditPage,
  SecurityDashboardPage,
  SecurityDnsPage,
  SecurityInfrastructurePage,
  SecurityPerimeterPage,
  SecuritySslPage,
  SecurityThreatsPage,
  SecurityBehaviorPage,
  SecurityVisitorsPage,
  SecurityEndpointsPage,
  SecurityAutoAuditPage,
  SecurityViewLogPage,
} from "./pages/admin/security/SecurityPages";

export function AdminRoutes() {
  return (
    <BrandingProvider>
      <Routes>
        <Route element={<AdminLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="automation" element={<AutomationStudioPage />} />
          <Route path="broker-os" element={<BrokerOsPage />} />
          <Route path="integrations" element={<IntegrationsHubPage />} />
          <Route path="integrations/metatrader" element={<MetaTraderHubPage />} />
          <Route path="knowme" element={<KnowmePage />} />
          <Route path="desk" element={<DeskPage />} />
          <Route path="desk/leads" element={<LeadInboxPage />} />
          <Route path="desk/psp-health" element={<PspHealthPage />} />
          <Route path="desk/tasks" element={<TasksPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="security" element={<SecurityDashboardPage />} />
          <Route path="security/perimeter" element={<SecurityPerimeterPage />} />
          <Route path="security/dns" element={<SecurityDnsPage />} />
          <Route path="security/ssl" element={<SecuritySslPage />} />
          <Route path="security/infrastructure" element={<SecurityInfrastructurePage />} />
          <Route path="security/audit" element={<SecurityAuditPage />} />
          <Route path="security/view-log" element={<SecurityViewLogPage />} />
          <Route path="security/access-settings" element={<SecurityAccessSettingsPage />} />
      <Route path="security/threats" element={<SecurityThreatsPage />} />
      <Route path="security/behavior" element={<SecurityBehaviorPage />} />
      <Route path="security/auto-audit" element={<SecurityAutoAuditPage />} />
      <Route path="security/visitors" element={<SecurityVisitorsPage />} />
      <Route path="security/endpoints" element={<SecurityEndpointsPage />} />
          <Route path="system/team-permissions" element={<TeamPermissionsPage />} />
          <Route path="system/groups" element={<GroupsPage />} />
          <Route path="system/desks" element={<DesksPage />} />
          <Route path="system/permissions" element={<PermissionsPage />} />
          <Route path="system/oauth" element={<OAuthClientsPage />} />
          <Route path="online" element={<OnlineVisitorsPage />} />
          <Route path="system/forex-commissions" element={<ForexCommissionsPage />} />
          <Route path="system/crypto-commissions" element={<CryptoCommissionsPage />} />
          <Route path="system/spread" element={<SpreadPage />} />
          <Route path="system/common" element={<CommonLayout />}>
            <Route index element={<Navigate to="countries" replace />} />
            <Route path="countries" element={<CountriesPage />} />
            <Route path="preferences" element={<PreferencesPage />} />
            <Route path="release-pdf" element={<CommonReleasePdfPage />} />
            <Route path="security" element={<SecurityLayout />}>
              <Route index element={<Navigate to="/admin/security/view-log" replace />} />
              <Route path="view-log" element={<Navigate to="/admin/security/view-log" replace />} />
              <Route path="settings" element={<Navigate to="/admin/security/access-settings" replace />} />
            </Route>
            <Route path="branding" element={<CommonSettingsPage />} />
          </Route>
          <Route path="system/common-legacy" element={<Navigate to="/admin/system/common/branding" replace />} />
          <Route path="system/payment-gateways" element={<PaymentGatewaysLayout />}>
            <Route index element={<Navigate to="test-cards" replace />} />
            <Route path="test-cards" element={<TestCreditCardsPage />} />
            <Route path="processors" element={<ProcessorsPage />} />
            <Route path=":section" element={<SystemPlaceholderPage />} />
          </Route>
          <Route element={<SuperAdminLayout />}>
            <Route path="system/configuration" element={<SuperAdminConfigurationPage />} />
            <Route path="system/error-logs" element={<SuperAdminErrorLogsPage />} />
            <Route path="system/smtp-logs" element={<SuperAdminSmtpLogsPage />} />
            <Route path="system/balance-events" element={<SuperAdminBalanceEventsPage />} />
            <Route path="system/history-logs" element={<SuperAdminHistoryLogsPage />} />
            <Route path="system/order-storage-logs" element={<SuperAdminOrderStorageLogsPage />} />
            <Route path="system/super-admin" element={<SuperAdminIndexRedirect />} />
          </Route>
          <Route path="system/tracking" element={<TrackPixelsPage />} />
          <Route path="system/event-logs" element={<EventLogsPage />} />
          <Route path="system/account-type" element={<AccountTypesPage />} />
          <Route path="system/auto-assign" element={<AutoAssignPage />} />
          <Route path="system/promo-code" element={<PromoCodesPage />} />
          <Route path="system/min-max-deposits" element={<DepositLimitsPage />} />
          <Route path="system/status" element={<ClientStatusesPage />} />
          <Route path="system/notifications" element={<NotificationsPage />} />
          <Route path="system/api-docs" element={<ApiDocsPage />} />
          <Route path="system/dynamic-status" element={<DynamicStatusPage />} />
          <Route path="system/trading-status" element={<TradingStatusPage />} />
          <Route path="system/:section" element={<SystemPlaceholderPage />} />
          <Route path="crm/users" element={<UsersPage />} />
          <Route path="crm/users/:id" element={<UserProfilePage />} />
          <Route path="crm/depositors" element={<DepositorsPage />} />
          <Route path="crm/agents" element={<AgentsPage />} />
          <Route path="crm/sales-report" element={<SalesReportPage />} />
          <Route path="crm/notes" element={<NotesPage />} />
          <Route path="crm/emails" element={<EmailsPage />} />
          <Route path="crm/support" element={<SupportDeskPage />} />
          <Route path="crm/comms" element={<CommsCenterPage />} />
          <Route path="crm/calendar" element={<CalendarPage />} />
          <Route path="funding" element={<Navigate to="/admin/cashier/deposit-requests" replace />} />
          <Route path="cashier/deposits" element={<CashierLedgerPage kind="deposits" />} />
          <Route path="cashier/deposit-requests" element={<DepositRequestsPage />} />
          <Route path="cashier/bonuses" element={<CashierLedgerPage kind="bonuses" />} />
          <Route path="cashier/adjustments" element={<CashierLedgerPage kind="adjustments" />} />
          <Route path="cashier/withdrawals" element={<CashierLedgerPage kind="withdrawals" />} />
          <Route path="cashier/ledger" element={<CashierLedgerPage kind="ledger" />} />
          <Route path="cashier/wire-req" element={<WireReqPage />} />
          <Route path="trading/trades" element={<TradesPage />} />
          <Route path="trading/assets" element={<AssetsPage />} />
          <Route path="trading/activity-hours" element={<ActivityHoursPage />} />
          <Route path="trading/net-positions" element={<NetPositionsPage />} />
          <Route path="trading/open-trades" element={<OpenTradesPage />} />
          <Route path="marketing/campaigns" element={<MarketingCampaignsPage />} />
          <Route path="marketing/partners-hq" element={<PartnersHqPage />} />
          <Route path="marketing/partners" element={<Navigate to="/admin/marketing/partners-hq" replace />} />
          <Route path="marketing/api-keys" element={<MarketingApiKeysPage />} />
          <Route path="marketing/trackers" element={<MarketingTrackersPage />} />
          <Route path="marketing/campaign-pivot" element={<MarketingPlaceholderPage title="Campaign Pivot" />} />
          <Route path="marketing/affiliate-managers" element={<MarketingPlaceholderPage title="Affiliate Managers" />} />
          <Route path="marketing/push-to-web" element={<MarketingPlaceholderPage title="Push To Web" />} />
          <Route path="trading/*" element={<Navigate to="/admin/trading/trades" replace />} />
          <Route path="marketing/*" element={<Navigate to="/admin/marketing/campaigns" replace />} />
        </Route>
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    </BrandingProvider>
  );
}
