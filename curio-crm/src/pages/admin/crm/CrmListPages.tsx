import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Calendar, Mail, NotebookPen, TrendingUp, UserPlus, Users } from "lucide-react";
import { client, fmtUsd } from "../../../api/client";
import {
  adminUi,
  btnPrimary,
  btnSecondary,
  ErrorBanner,
  fmtDate,
  TableHead,
} from "../../../components/admin/CrmShell";
import {
  CrmAgentRow,
  CrmCompactTable,
  CrmEmpty,
  CrmHero,
  CrmPageLayout,
  CrmSection,
  CrmStatCard,
  CrmStatGrid,
  CrmStepCard,
} from "../../../components/admin/crm/CrmPageLayout";

function tableBody(children: React.ReactNode) {
  return (
    <table className="w-full min-w-[640px] text-left text-sm">
      {children}
    </table>
  );
}

function Td({
  children,
  className = "",
  colSpan,
}: {
  children: React.ReactNode;
  className?: string;
  colSpan?: number;
}) {
  return (
    <td colSpan={colSpan} className={`px-4 py-3 align-middle ${className}`}>
      {children}
    </td>
  );
}

function Tr({ children }: { children: React.ReactNode }) {
  return <tr className={adminUi.tableRow}>{children}</tr>;
}

export function DepositorsPage() {
  const [rows, setRows] = useState<Awaited<ReturnType<typeof client.adminDepositors>>["depositors"]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    void client
      .adminDepositors()
      .then((r) => {
        setRows(r.depositors);
        setError(null);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load depositors."))
      .finally(() => setLoading(false));
  }, []);

  const totalCash = useMemo(() => rows.reduce((s, r) => s + (Number(r.cashBalance) || 0), 0), [rows]);

  return (
    <CrmPageLayout>
      <CrmHero
        eyebrow="Money · Funded"
        title="Funded accounts"
        subtitle="Clients with balance on the book — your retention and upsell list."
        actions={
          <Link to="/admin/cashier/deposits" className={btnSecondary}>
            Cashier
          </Link>
        }
      />
      <ErrorBanner message={error} />
      <CrmStatGrid>
        <CrmStatCard label="Funded clients" value={loading ? "…" : rows.length} accent="emerald" />
        <CrmStatCard label="Total cash on book" value={loading ? "…" : fmtUsd(totalCash)} accent="violet" />
        <CrmStatCard label="Focus" value="Retention" hint="Sort by last deposit in the table below." accent="slate" />
      </CrmStatGrid>
      <CrmSection title="Funded clients" subtitle="Tap a name for the full client file.">
        <CrmCompactTable>
          {tableBody(
            <>
              <TableHead cols={["Client", "Cash", "Deposits", "#", "Last deposit", "Joined"]} />
              <tbody>
                {loading ? (
                  <Tr>
                    <Td className="py-12 text-center text-slate-400" colSpan={6}>
                      Loading…
                    </Td>
                  </Tr>
                ) : rows.length === 0 ? (
                  <Tr>
                    <Td className="py-12 text-center text-slate-500" colSpan={6}>
                      No funded accounts yet. Approve a deposit in Cashier or set an initial balance on create.
                    </Td>
                  </Tr>
                ) : (
                  rows.map((r) => (
                    <Tr key={r.id}>
                      <Td>
                        <Link
                          to={`/admin/crm/users/${r.id}`}
                          className="font-semibold text-violet-700 hover:underline"
                        >
                          {r.username}
                        </Link>
                      </Td>
                      <Td className="tabular-nums font-medium">{fmtUsd(r.cashBalance)}</Td>
                      <Td className="tabular-nums text-emerald-700">{fmtUsd(r.totalDeposits)}</Td>
                      <Td className="tabular-nums">{r.depositCount}</Td>
                      <Td className="text-slate-600">{r.lastDepositAt ? fmtDate(r.lastDepositAt) : "—"}</Td>
                      <Td className="text-slate-500">{fmtDate(r.createdAt)}</Td>
                    </Tr>
                  ))
                )}
              </tbody>
            </>,
          )}
        </CrmCompactTable>
      </CrmSection>
    </CrmPageLayout>
  );
}

export function NotesPage() {
  const [notes, setNotes] = useState<Awaited<ReturnType<typeof client.adminNotes>>["notes"]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void client.adminNotes().then((r) => setNotes(r.notes)).catch((e) => setError(e instanceof Error ? e.message : "Failed"));
  }, []);

  return (
    <CrmPageLayout>
      <CrmHero
        eyebrow="Intel"
        title="Notes"
        subtitle="Desk intelligence left on clients — read before you call."
        actions={<NotebookPen size={20} className="text-violet-400" aria-hidden />}
      />
      <ErrorBanner message={error} />
      <CrmSection title={`${notes.length} note${notes.length === 1 ? "" : "s"}`} subtitle="Newest activity across the book.">
        <CrmCompactTable>
          {tableBody(
            <>
              <TableHead cols={["When", "Client", "Author", "Note"]} />
              <tbody>
                {notes.length === 0 ? (
                  <Tr>
                    <Td colSpan={4} className="py-12 text-center text-slate-400">
                      No notes yet.
                    </Td>
                  </Tr>
                ) : (
                  notes.map((n) => (
                    <Tr key={n.id}>
                      <Td className="whitespace-nowrap text-slate-500">{fmtDate(n.created_at)}</Td>
                      <Td>
                        {n.user_id ? (
                          <Link to={`/admin/crm/users/${n.user_id}`} className="font-medium text-violet-700 hover:underline">
                            {n.username ?? n.user_id.slice(0, 8)}
                          </Link>
                        ) : (
                          "—"
                        )}
                      </Td>
                      <Td>{n.authorName ?? "—"}</Td>
                      <Td className="max-w-md text-slate-600">{n.body}</Td>
                    </Tr>
                  ))
                )}
              </tbody>
            </>,
          )}
        </CrmCompactTable>
      </CrmSection>
    </CrmPageLayout>
  );
}

export function EmailsPage() {
  const [emails, setEmails] = useState<Awaited<ReturnType<typeof client.adminEmails>>["emails"]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void client.adminEmails().then((r) => setEmails(r.emails)).catch((e) => setError(e instanceof Error ? e.message : "Failed"));
  }, []);

  return (
    <CrmPageLayout>
      <CrmHero
        eyebrow="Comms"
        title="Email log"
        subtitle="Outbound messages logged in CRM for audit — not your mail server inbox."
        actions={<Mail size={20} className="text-violet-400" aria-hidden />}
      />
      <ErrorBanner message={error} />
      <CrmSection title="Logged emails" subtitle="Proof of outreach for compliance and handoffs.">
        <CrmCompactTable>
          {tableBody(
            <>
              <TableHead cols={["Sent", "Client", "Subject", "Author"]} />
              <tbody>
                {emails.map((e) => (
                  <Tr key={e.id}>
                    <Td className="whitespace-nowrap text-slate-500">{fmtDate(e.sent_at)}</Td>
                    <Td>
                      <Link to={`/admin/crm/users/${e.user_id}`} className="font-medium text-violet-700 hover:underline">
                        {e.username ?? e.user_id.slice(0, 8)}
                      </Link>
                    </Td>
                    <Td className="font-medium text-slate-800">{e.subject}</Td>
                    <Td className="text-slate-600">{e.authorName ?? "—"}</Td>
                  </Tr>
                ))}
              </tbody>
            </>,
          )}
        </CrmCompactTable>
      </CrmSection>
    </CrmPageLayout>
  );
}

export function SalesReportPage() {
  const [rows, setRows] = useState<Awaited<ReturnType<typeof client.adminSalesReport>>["rows"]>([]);
  const [period, setPeriod] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void client
      .adminSalesReport("this_month")
      .then((r) => {
        setRows(r.rows);
        setPeriod(r.period);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed"));
  }, []);

  const netTotal = useMemo(() => rows.reduce((s, r) => s + r.net, 0), [rows]);

  return (
    <CrmPageLayout>
      <CrmHero
        eyebrow="Performance"
        title="Scoreboard"
        subtitle={period ? `Period: ${period}` : "Agent and client money movement."}
        actions={<TrendingUp size={20} className="text-violet-400" aria-hidden />}
      />
      <ErrorBanner message={error} />
      <CrmStatGrid>
        <CrmStatCard label="Rows" value={rows.length} />
        <CrmStatCard label="Net movement" value={fmtUsd(netTotal)} accent="emerald" />
        <CrmStatCard label="Use with" value="Desk Team" hint="Match agent names to owner on clients." accent="slate" />
      </CrmStatGrid>
      <CrmSection title="By client" subtitle="Deposits, withdrawals, and net for the selected period.">
        <CrmCompactTable>
          {tableBody(
            <>
              <TableHead cols={["Client", "Deposits", "Withdrawals", "Net", "Transactions"]} />
              <tbody>
                {rows.map((r) => (
                  <Tr key={r.username}>
                    <Td className="font-semibold text-slate-900">{r.username}</Td>
                    <Td className="tabular-nums text-emerald-700">{fmtUsd(r.deposits)}</Td>
                    <Td className="tabular-nums text-rose-600">{fmtUsd(r.withdrawals)}</Td>
                    <Td className="tabular-nums font-medium">{fmtUsd(r.net)}</Td>
                    <Td className="tabular-nums">{r.depositTxCount}</Td>
                  </Tr>
                ))}
              </tbody>
            </>,
          )}
        </CrmCompactTable>
      </CrmSection>
    </CrmPageLayout>
  );
}

export function AgentsPage() {
  const [roster, setRoster] = useState<Awaited<ReturnType<typeof client.adminAgentRoster>> | null>(null);
  const [logins, setLogins] = useState<Awaited<ReturnType<typeof client.adminAgents>>["agents"]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    void Promise.all([
      client.adminAgentRoster().catch(() => ({ agents: [] as { name: string; clientCount: number }[], totalClients: 0 })),
      client.adminAgents().catch(() => ({ agents: [] as Awaited<ReturnType<typeof client.adminAgents>>["agents"] })),
    ])
      .then(([r, l]) => {
        setRoster(r);
        setLogins(l.agents);
        setError(null);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load desk team."))
      .finally(() => setLoading(false));
  }, []);

  const topAgent = roster?.agents[0];

  return (
    <CrmPageLayout>
      <CrmHero
        eyebrow="Agents · Ownership"
        title="Desk Team"
        subtitle="Every client has one owner agent. Assign here, on All Clients, in Hot Leads, or on the client file."
        actions={
          <>
            <Link to="/admin/crm/users" className={`inline-flex items-center gap-2 ${btnPrimary}`}>
              <Users size={16} /> Assign clients
            </Link>
            <Link
              to="/admin/system/team-permissions"
              className={`inline-flex items-center gap-2 ${btnSecondary}`}
            >
              <UserPlus size={16} /> Add login
            </Link>
          </>
        }
      />
      <ErrorBanner message={error} />

      <CrmStatGrid>
        <CrmStatCard
          label="Owner agents"
          value={loading ? "…" : (roster?.agents.length ?? 0)}
          hint="Names used on client records"
        />
        <CrmStatCard
          label="Clients on book"
          value={loading ? "…" : (roster?.totalClients.toLocaleString() ?? 0)}
          accent="emerald"
        />
        <CrmStatCard
          label="Largest book"
          value={loading ? "…" : topAgent?.name ?? "—"}
          hint={topAgent ? `${topAgent.clientCount} clients` : "Assign from All Clients"}
          accent="amber"
        />
      </CrmStatGrid>

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="space-y-6 lg:col-span-3">
          <CrmSection
            title="Ownership roster"
            subtitle="Who owns how many clients — open a book to filter All Clients."
            action={
              <Link to="/admin/crm/users" className="text-xs font-semibold text-violet-600 hover:underline">
                All Clients →
              </Link>
            }
          >
            {loading ? (
              <p className="text-sm text-slate-400">Loading roster…</p>
            ) : !roster?.agents.length ? (
              <CrmEmpty>
                No assignments yet.{" "}
                <Link to="/admin/crm/users" className="font-semibold text-violet-700 hover:underline">
                  Assign the first client →
                </Link>
              </CrmEmpty>
            ) : (
              <div className="space-y-2">
                {roster.agents.map((a) => (
                  <CrmAgentRow
                    key={a.name}
                    name={a.name}
                    clientCount={a.clientCount}
                    totalClients={roster.totalClients}
                  />
                ))}
              </div>
            )}
          </CrmSection>
        </div>

        <div className="space-y-6 lg:col-span-2">
          <CrmSection title="Assign in 3 steps" subtitle="The path your admins use every day.">
            <CrmStepCard
              steps={[
                {
                  n: 1,
                  text: (
                    <>
                      Open{" "}
                      <Link to="/admin/crm/users" className="font-semibold text-violet-700 hover:underline">
                        All Clients
                      </Link>
                    </>
                  ),
                },
                { n: 2, text: "Check the rows you want (or use Desk panel scope)." },
                {
                  n: 3,
                  text: (
                    <>
                      Green <strong>Assign owner</strong> bar → pick agent → <strong>Assign agent</strong>
                    </>
                  ),
                },
              ]}
            />
            <p className="mt-4 text-xs leading-relaxed text-slate-500">
              Hot lead?{" "}
              <Link to="/admin/desk/leads" className="font-semibold text-violet-600 hover:underline">
                Hot Leads
              </Link>{" "}
              → same agent name flows to the client record and Scoreboard.
            </p>
          </CrmSection>

          <CrmSection title="Staff logins" subtitle="CRM operator accounts — match username to owner name when you can.">
            {logins.length === 0 ? (
              <CrmEmpty>No staff logins yet.</CrmEmpty>
            ) : (
              <ul className="divide-y divide-slate-100">
                {logins.map((a) => (
                  <li key={a.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                    <div>
                      <p className="font-semibold text-slate-900">{a.username}</p>
                      <p className="text-xs capitalize text-slate-500">{a.role}</p>
                    </div>
                    <span className="text-[11px] tabular-nums text-slate-400">{fmtDate(a.createdAt)}</span>
                  </li>
                ))}
              </ul>
            )}
          </CrmSection>
        </div>
      </div>
    </CrmPageLayout>
  );
}

export function CalendarPage() {
  const [events, setEvents] = useState<Awaited<ReturnType<typeof client.adminCalendar>>["events"]>([]);

  useEffect(() => {
    void client.adminCalendar().then((r) => setEvents(r.events)).catch(() => null);
  }, []);

  return (
    <CrmPageLayout>
      <CrmHero
        eyebrow="Schedule"
        title="Calendar"
        subtitle="Follow-ups, callbacks, and desk events tied to clients."
        actions={<Calendar size={20} className="text-violet-400" aria-hidden />}
      />
      <CrmSection title={`${events.length} upcoming`} subtitle="Open a client file to add more context.">
        <CrmCompactTable>
          {tableBody(
            <>
              <TableHead cols={["When", "Type", "Title", "Client"]} />
              <tbody>
                {events.length === 0 ? (
                  <Tr>
                    <Td colSpan={4} className="py-12 text-center text-slate-400">
                      No events on the calendar.
                    </Td>
                  </Tr>
                ) : (
                  events.map((e) => (
                    <Tr key={e.id}>
                      <Td className="whitespace-nowrap">{fmtDate(e.at)}</Td>
                      <Td className="capitalize text-slate-600">{e.type}</Td>
                      <Td className="font-medium text-slate-900">{e.title}</Td>
                      <Td>{e.username ?? "—"}</Td>
                    </Tr>
                  ))
                )}
              </tbody>
            </>,
          )}
        </CrmCompactTable>
      </CrmSection>
    </CrmPageLayout>
  );
}
