import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { client, type MarketingApiKey, type MarketingCampaign, type MarketingPartner, type MarketingTracker } from "../../../api/client";
import { btnPrimary, DataTable, ErrorBanner, PageHeader, Panel, TableHead, fmtDate } from "../../../components/admin/CrmShell";

function SimpleListPage({
  title,
  subtitle,
  cols,
  rows,
  empty,
}: {
  title: string;
  subtitle: string;
  cols: string[];
  rows: React.ReactNode;
  empty: string;
}) {
  return (
    <div className="p-4">
      <PageHeader title={title} subtitle={subtitle} />
      <DataTable>
        <TableHead cols={cols} />
        <tbody>{rows}</tbody>
      </DataTable>
      {!rows ? <p className="mt-4 text-sm text-slate-400">{empty}</p> : null}
    </div>
  );
}

export function MarketingCampaignsPage() {
  const [rows, setRows] = useState<MarketingCampaign[]>([]);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const data = await client.adminMarketingCampaigns();
    setRows(data.campaigns);
  }

  useEffect(() => {
    void load().catch((e) => setError(e.message));
  }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      await client.adminCreateCampaign({ name: name.trim() });
      setName("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    }
  }

  return (
    <div className="p-4">
      <PageHeader title="Campaigns" subtitle="Track marketing campaigns and acquisition sources" />
      <Panel className="mb-4 flex flex-wrap gap-2 p-3 text-xs">
        <span className="text-slate-500">Related:</span>
        <Link to="/admin/marketing/partners" className="font-semibold text-teal-700 hover:underline">
          Allies
        </Link>
        <Link to="/admin/marketing/trackers" className="font-semibold text-teal-700 hover:underline">
          Attribution
        </Link>
        <Link to="/admin/marketing/campaign-pivot" className="font-semibold text-teal-700 hover:underline">
          Campaign Pivot
        </Link>
        <Link to="/admin/system/promo-code" className="font-semibold text-teal-700 hover:underline">
          Promo Code
        </Link>
        <Link to="/admin/knowme" className="font-semibold text-teal-700 hover:underline">
          KNOWME affiliate slide
        </Link>
      </Panel>
      <ErrorBanner message={error} />
      <Panel className="mb-4 flex flex-wrap gap-2 p-4">
        <form onSubmit={(e) => void create(e)} className="flex flex-wrap gap-2">
          <input
            className="rounded border border-slate-200 px-3 py-2 text-sm"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Campaign name"
          />
          <button type="submit" className={btnPrimary}>
            Add campaign
          </button>
        </form>
      </Panel>
      <SimpleListPage
        title=""
        subtitle=""
        cols={["Name", "Partner", "Budget", "Created"]}
        empty="No campaigns yet"
        rows={
          <>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-[#f5f5f5] text-sm">
                <td className="px-4 py-2.5 font-medium">{r.name}</td>
                <td className="px-4 py-2.5">{r.partner_name ?? "—"}</td>
                <td className="px-4 py-2.5">{r.budget != null ? r.budget : "—"}</td>
                <td className="px-4 py-2.5">{fmtDate(r.created_at)}</td>
              </tr>
            ))}
          </>
        }
      />
    </div>
  );
}

export function MarketingPartnersPage() {
  const [rows, setRows] = useState<MarketingPartner[]>([]);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void client
      .adminMarketingPartners()
      .then((d) => setRows(d.partners))
      .catch((e) => setError(e.message));
  }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    await client.adminCreatePartner({ name: name.trim() });
    setName("");
    const data = await client.adminMarketingPartners();
    setRows(data.partners);
  }

  return (
    <div className="p-4">
      <PageHeader title="Partners" subtitle="Affiliate and IB partner registry" />
      <ErrorBanner message={error} />
      <Panel className="mb-4 p-4">
        <form onSubmit={(e) => void create(e)} className="flex gap-2">
          <input className="rounded border border-slate-200 px-3 py-2 text-sm" value={name} onChange={(e) => setName(e.target.value)} placeholder="Partner name" />
          <button type="submit" className={btnPrimary}>Add partner</button>
        </form>
      </Panel>
      <DataTable>
        <TableHead cols={["Name", "Email", "Commission %", "Created"]} />
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b border-[#f5f5f5] text-sm">
              <td className="px-4 py-2.5">{r.name}</td>
              <td className="px-4 py-2.5">{r.contact_email ?? "—"}</td>
              <td className="px-4 py-2.5">{r.commission_pct ?? "—"}</td>
              <td className="px-4 py-2.5">{fmtDate(r.created_at)}</td>
            </tr>
          ))}
        </tbody>
      </DataTable>
    </div>
  );
}

export function MarketingApiKeysPage() {
  const [rows, setRows] = useState<MarketingApiKey[]>([]);
  const [name, setName] = useState("");
  const [createdKey, setCreatedKey] = useState<string | null>(null);

  async function load() {
    setRows((await client.adminMarketingApiKeys()).keys);
  }

  useEffect(() => {
    void load();
  }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    const data = await client.adminCreateApiKey(name.trim() || "API Key");
    setCreatedKey((data as { rawKey?: string }).rawKey ?? null);
    setName("");
    await load();
  }

  return (
    <div className="p-4">
      <PageHeader title="API Keys" subtitle="Integrate external systems with your CRM" />
      {createdKey ? (
        <Panel className="mb-4 border border-teal-600 bg-teal-50 p-4 text-sm">
          New key (copy now): <code className="font-mono">{createdKey}</code>
        </Panel>
      ) : null}
      <Panel className="mb-4 p-4">
        <form onSubmit={(e) => void create(e)} className="flex gap-2">
          <input className="rounded border border-slate-200 px-3 py-2 text-sm" value={name} onChange={(e) => setName(e.target.value)} placeholder="Key label" />
          <button type="submit" className={btnPrimary}>Generate key</button>
        </form>
      </Panel>
      <DataTable>
        <TableHead cols={["Name", "Prefix", "Status", "Created", ""]} />
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b border-[#f5f5f5] text-sm">
              <td className="px-4 py-2.5">{r.name}</td>
              <td className="px-4 py-2.5 font-mono">{r.key_prefix}…</td>
              <td className="px-4 py-2.5">{r.enabled ? "Active" : "Revoked"}</td>
              <td className="px-4 py-2.5">{fmtDate(r.created_at)}</td>
              <td className="px-4 py-2.5">
                {r.enabled ? (
                  <button type="button" className="text-xs text-rose-600" onClick={() => void client.adminRevokeApiKey(r.id).then(load)}>
                    Revoke
                  </button>
                ) : null}
              </td>
            </tr>
          ))}
        </tbody>
      </DataTable>
    </div>
  );
}

export function MarketingTrackersPage() {
  const [rows, setRows] = useState<MarketingTracker[]>([]);
  const [name, setName] = useState("");

  async function load() {
    setRows((await client.adminMarketingTrackers()).trackers);
  }

  useEffect(() => {
    void load();
  }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    await client.adminCreateTracker({ name: name.trim(), platform: "custom" });
    setName("");
    await load();
  }

  return (
    <div className="p-4">
      <PageHeader title="Trackers & Pixels" subtitle="Conversion tracking for live traffic and ad campaigns" />
      <Panel className="mb-4 p-4">
        <form onSubmit={(e) => void create(e)} className="flex gap-2">
          <input className="rounded border border-slate-200 px-3 py-2 text-sm" value={name} onChange={(e) => setName(e.target.value)} placeholder="Tracker name" />
          <button type="submit" className={btnPrimary}>Add tracker</button>
        </form>
      </Panel>
      <DataTable>
        <TableHead cols={["Name", "Platform", "Pixel ID", "Created", ""]} />
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b border-[#f5f5f5] text-sm">
              <td className="px-4 py-2.5">{r.name}</td>
              <td className="px-4 py-2.5">{r.platform}</td>
              <td className="px-4 py-2.5 font-mono text-xs">{r.pixel_id ?? "—"}</td>
              <td className="px-4 py-2.5">{fmtDate(r.created_at)}</td>
              <td className="px-4 py-2.5 text-right">
                <button
                  type="button"
                  className="text-xs text-rose-600 hover:underline"
                  onClick={() => void client.adminDeleteTracker(r.id).then(load)}
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </DataTable>
    </div>
  );
}

export function MarketingPlaceholderPage({ title }: { title: string }) {
  return (
    <div className="p-4">
      <PageHeader title={title} subtitle="Use live modules below until this screen is built out" />
      <Panel className="space-y-4 p-6 text-sm text-slate-600">
        <p>
          <strong className="text-slate-800">{title}</strong> is on the roadmap. For today, run acquisition and
          attribution from the working pages:
        </p>
        <ul className="list-inside list-disc space-y-1 text-teal-700">
          <li>
            <Link to="/admin/marketing/campaigns" className="hover:underline">
              Campaigns
            </Link>{" "}
            — UTM links and sources
          </li>
          <li>
            <Link to="/admin/marketing/partners" className="hover:underline">
              Allies
            </Link>{" "}
            — affiliate / IB roster
          </li>
          <li>
            <Link to="/admin/marketing/trackers" className="hover:underline">
              Attribution
            </Link>{" "}
            — pixels and postbacks
          </li>
          <li>
            <Link to="/admin/marketing/campaign-pivot" className="hover:underline">
              Campaign Pivot
            </Link>{" "}
            — preview reporting hub
          </li>
          <li>
            <Link to="/admin/system/tracking" className="hover:underline">
              Tracking
            </Link>{" "}
            — system-level pixels
          </li>
          <li>
            <Link to="/admin/system/promo-code" className="hover:underline">
              Promo Code
            </Link>{" "}
            — signup codes tied to campaigns
          </li>
          <li>
            <Link to="/admin/online" className="hover:underline">
              Live Floor
            </Link>{" "}
            — live traffic
          </li>
          <li>
            <Link to="/admin/knowme" className="hover:underline">
              KNOWME
            </Link>{" "}
            — affiliate flow slide + plain-English guides
          </li>
          <li>
            <Link to="/admin/desk" className="hover:underline">
              Wallstreet AI
            </Link>{" "}
            — ask “campaign attribution” or “affiliate onboarding”
          </li>
        </ul>
        <p className="text-slate-500">
          Registration URL example:{" "}
          <code className="text-slate-800">/?utm_campaign=facebook_leads</code>
        </p>
      </Panel>
    </div>
  );
}
