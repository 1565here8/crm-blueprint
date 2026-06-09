import { BarChart3, Layers, Percent, UsersRound } from "lucide-react";
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { client, type MarketingPartner } from "../../../api/client";
import { CurioniStatCard } from "../../../components/admin/curioni/CurioniStatCard";
import { AdminPageHeader, DataTable, ErrorBanner, Panel, TableHead, fmtDate } from "../../../components/admin/CrmShell";
import { curioni } from "../../../lib/curioniDesign";

export function PartnersHqPage() {
  const [rows, setRows] = useState<MarketingPartner[]>([]);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void client
      .adminMarketingPartners()
      .then((d) => setRows(d.partners))
      .catch((e) => setError(e instanceof Error ? e.message : "Load failed"));
  }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    await client.adminCreatePartner({ name: name.trim() });
    setName("");
    const data = await client.adminMarketingPartners();
    setRows(data.partners);
  }

  const withCommission = rows.filter((r) => r.commission_pct > 0).length;

  return (
    <div>
      <AdminPageHeader
        title="Partners HQ"
        subtitle="IB hierarchy, commission matrix, and ally performance — one command view."
      />
      <ErrorBanner message={error} />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <CurioniStatCard label="Active partners" value={String(rows.length)} icon={UsersRound} tone="violet" />
        <CurioniStatCard label="Commission tiers set" value={String(withCommission)} icon={Percent} tone="cyan" />
        <CurioniStatCard
          label="Forex matrix"
          value="Configure"
          to="/admin/system/forex-commissions"
          icon={Layers}
          tone="emerald"
        />
        <CurioniStatCard
          label="Scoreboard"
          value="Open"
          to="/admin/crm/sales-report"
          icon={BarChart3}
          tone="amber"
        />
      </div>

      <div className="mb-5 grid gap-4 lg:grid-cols-3">
        <Link
          to="/admin/system/forex-commissions"
          className={`rounded-xl border border-slate-200/80 p-4 transition hover:shadow-md ${curioni.panelGlow}`}
        >
          <p className="text-sm font-semibold text-slate-800">Trade-based commissions</p>
          <p className="mt-1 text-xs text-slate-500">Tier × currency matrix — multi-level IB payouts.</p>
        </Link>
        <Link
          to="/admin/system/account-type"
          className={`rounded-xl border border-slate-200/80 p-4 transition hover:shadow-md ${curioni.panelGlow}`}
        >
          <p className="text-sm font-semibold text-slate-800">Retail · VIP · IB tiers</p>
          <p className="mt-1 text-xs text-slate-500">Product tiers control leverage, spreads, and bonuses.</p>
        </Link>
        <Link
          to="/admin/marketing/campaigns"
          className={`rounded-xl border border-slate-200/80 p-4 transition hover:shadow-md ${curioni.panelGlow}`}
        >
          <p className="text-sm font-semibold text-slate-800">Campaign attribution</p>
          <p className="mt-1 text-xs text-slate-500">UTM sources tied to partner signups.</p>
        </Link>
      </div>

      <Panel className="mb-4 p-4">
        <form onSubmit={(e) => void create(e)} className="flex flex-wrap gap-2">
          <input
            className="min-w-[200px] flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="New IB / affiliate name"
          />
          <button type="submit" className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-500">
            Add partner
          </button>
        </form>
      </Panel>

      <DataTable>
        <TableHead cols={["Partner", "Email", "Commission %", "Created", "Clients"]} />
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b border-slate-50 text-sm hover:bg-violet-50/20">
              <td className="px-4 py-2.5 font-medium text-slate-800">{r.name}</td>
              <td className="px-4 py-2.5">{r.contact_email ?? "—"}</td>
              <td className="px-4 py-2.5">{r.commission_pct ?? "—"}</td>
              <td className="px-4 py-2.5 text-slate-500">{fmtDate(r.created_at)}</td>
              <td className="px-4 py-2.5">
                <Link to="/admin/crm/users" className="text-xs font-semibold text-violet-600 hover:underline">
                  Filter roster →
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </DataTable>
    </div>
  );
}
