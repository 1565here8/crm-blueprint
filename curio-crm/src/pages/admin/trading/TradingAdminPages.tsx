import React, { useMemo, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { client } from "../../../api/client";
import { DataTable, ErrorBanner, AdminPageHeader, TableHead } from "../../../components/admin/CrmShell";

export function NetPositionsPage() {
  const [open, setOpen] = useState<Awaited<ReturnType<typeof client.adminPositions>>["positions"]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void client
      .adminPositions("open")
      .then((d) => setOpen(d.positions))
      .catch((e) => setError(e.message));
  }, []);

  const bySymbol = useMemo(() => {
    const map = new Map<string, { symbol: string; netQty: number; exposure: number; count: number }>();
    for (const p of open) {
      const sign = p.side === "long" ? 1 : -1;
      const cur = map.get(p.symbol) ?? { symbol: p.symbol, netQty: 0, exposure: 0, count: 0 };
      cur.netQty += p.qty * sign;
      cur.exposure += p.marketValue;
      cur.count += 1;
      map.set(p.symbol, cur);
    }
    return [...map.values()].sort((a, b) => b.exposure - a.exposure);
  }, [open]);

  return (
    <div className="p-4">
      <AdminPageHeader title="Desk Management" subtitle="Aggregated open exposure by instrument" />
      <ErrorBanner message={error} />
      <DataTable>
        <TableHead cols={["Symbol", "Net lots", "Gross exposure", "Open trades"]} />
        <tbody>
          {bySymbol.map((r) => (
            <tr key={r.symbol} className="border-b border-[#f5f5f5] text-sm">
              <td className="px-4 py-2.5 font-mono font-semibold">
                <Link to={`/admin/trading/trades`} className="text-teal-600 hover:underline">
                  {r.symbol}
                </Link>
              </td>
              <td className="px-4 py-2.5">{r.netQty.toFixed(4)}</td>
              <td className="px-4 py-2.5">${r.exposure.toLocaleString("en-US", { minimumFractionDigits: 2 })}</td>
              <td className="px-4 py-2.5">{r.count}</td>
            </tr>
          ))}
        </tbody>
      </DataTable>
    </div>
  );
}

export function AssetsPage() {
  const [catalog, setCatalog] = useState<Awaited<ReturnType<typeof client.catalog>> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void client
      .catalog()
      .then(setCatalog)
      .catch((e) => setError(e.message));
  }, []);

  const counts = useMemo(() => {
    if (!catalog) return [];
    const map = new Map<string, number>();
    for (const i of catalog.instruments) {
      map.set(i.category, (map.get(i.category) ?? 0) + 1);
    }
    return catalog.categories.map((c) => ({ ...c, count: map.get(c.id) ?? 0 }));
  }, [catalog]);

  return (
    <div className="p-4">
      <AdminPageHeader title="Assets" subtitle={`${catalog?.totalInstruments ?? 0} tradable instruments on platform`} />
      <ErrorBanner message={error} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {counts.map((cat) => (
          <div key={cat.id} className="rounded border border-slate-100 bg-white p-4 shadow-sm">
            <h3 className="font-semibold text-slate-800">{cat.label}</h3>
            <p className="mt-1 text-2xl font-bold text-teal-600">{cat.count}</p>
            <p className="mt-1 text-xs text-slate-400">{cat.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ActivityHoursPage() {
  const [market, setMarket] = useState<Awaited<ReturnType<typeof client.session>>["market"] | undefined>(undefined);

  useEffect(() => {
    void client.session().then((d) => setMarket(d.market ?? undefined));
  }, []);

  return (
    <div className="p-4">
      <AdminPageHeader title="Activity Hours" subtitle="Market session status and trading hours" />
      {market ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded border border-slate-100 bg-white p-5 shadow-sm">
            <p className="text-xs uppercase text-slate-500">US Equities</p>
            <p className="mt-2 text-lg font-semibold text-slate-800">{market.usEquity.label}</p>
            <p className="text-sm text-slate-600">{market.usEquity.hoursNote}</p>
            <p className={`mt-2 text-sm font-medium ${market.usEquity.tradable ? "text-emerald-600" : "text-slate-400"}`}>
              {market.usEquity.tradable ? "Market open" : "Market closed"}
            </p>
          </div>
          <div className="rounded border border-slate-100 bg-white p-5 shadow-sm">
            <p className="text-xs uppercase text-slate-500">Crypto</p>
            <p className="mt-2 text-lg font-semibold text-slate-800">{market.crypto.label}</p>
            <p className="text-sm text-slate-600">{market.crypto.hoursNote}</p>
            <p className={`mt-2 text-sm font-medium ${market.crypto.tradable ? "text-emerald-600" : "text-slate-400"}`}>
              {market.crypto.tradable ? "Market open" : "Market closed"}
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
