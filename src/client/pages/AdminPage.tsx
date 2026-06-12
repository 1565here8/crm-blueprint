import React, { useEffect, useState } from "react";
import {
  Activity,
  CreditCard,
  FileText,
  LayoutDashboard,
  Shield,
  ShieldAlert,
  Users,
} from "lucide-react";
import { AdminDashboard } from "../components/admin/AdminDashboard";
import { UserManagement } from "../components/admin/UserManagement";
import { PaymentRevenue } from "../components/admin/PaymentRevenue";
import { ContentModeration } from "../components/admin/ContentModeration";
import { ScannerControl } from "../components/admin/ScannerControl";
import { useUserIdentity } from "../context/SessionContext";

type AdminTab = "dashboard" | "users" | "payments" | "content" | "scanner";

const tabs: { id: AdminTab; label: string; icon: React.ReactNode }[] = [
  { id: "dashboard", label: "Dashboard", icon: <LayoutDashboard className="h-4 w-4" /> },
  { id: "users", label: "Users", icon: <Users className="h-4 w-4" /> },
  { id: "payments", label: "Payments", icon: <CreditCard className="h-4 w-4" /> },
  { id: "content", label: "Content", icon: <FileText className="h-4 w-4" /> },
  { id: "scanner", label: "Scanner", icon: <Activity className="h-4 w-4" /> },
];

export function AdminPage() {
  const { role } = useUserIdentity();
  const [activeTab, setActiveTab] = useState<AdminTab>("dashboard");

  if (role !== "admin") {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <ShieldAlert className="mb-4 h-12 w-12 text-[color:var(--danger)]" />
        <h1 className="heading-premium">Access Denied</h1>
        <p className="body-muted mt-2">You do not have admin privileges.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-8 flex items-center gap-3">
        <Shield className="h-6 w-6 text-[color:var(--accent)]" />
        <h1 className="heading-premium">Admin Panel</h1>
      </div>

      <div className="mb-6 flex gap-1 overflow-x-auto rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-inset)] p-1.5">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition ${
              activeTab === tab.id
                ? "bg-[color:var(--surface-card)] text-[color:var(--text-primary)] shadow-sm"
                : "text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)]"
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      <div>
        {activeTab === "dashboard" && <AdminDashboard />}
        {activeTab === "users" && <UserManagement />}
        {activeTab === "payments" && <PaymentRevenue />}
        {activeTab === "content" && <ContentModeration />}
        {activeTab === "scanner" && <ScannerControl />}
      </div>
    </div>
  );
}
