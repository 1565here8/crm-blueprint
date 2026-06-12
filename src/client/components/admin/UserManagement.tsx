import React, { useEffect, useState } from "react";
import {
  Ban,
  Globe,
  Mail,
  Search,
  Shield,
  ShieldOff,
  Trash2,
  UserX,
} from "lucide-react";

type BannedEntry = {
  id: string;
  type: "user" | "ip" | "email";
  value: string;
  reason: string;
  bannedAt: string;
};

type User = {
  id: string;
  email: string;
  role: "user" | "admin";
  credits: number;
  createdAt: string;
  lastSeen: string;
  ip: string;
  banned: boolean;
};

export function UserManagement() {
  const [bannedList, setBannedList] = useState<BannedEntry[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [banType, setBanType] = useState<"user" | "ip" | "email">("user");
  const [banValue, setBanValue] = useState("");
  const [banReason, setBanReason] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [usersRes, bannedRes] = await Promise.all([
        fetch("/api/admin/users", { credentials: "include" }),
        fetch("/api/admin/banned", { credentials: "include" }),
      ]);
      if (usersRes.ok) setUsers(await usersRes.json());
      if (bannedRes.ok) setBannedList(await bannedRes.json());
    } catch {
      // endpoints not yet implemented
    } finally {
      setLoading(false);
    }
  }

  async function handleBan() {
    if (!banValue.trim()) return;
    try {
      const res = await fetch("/api/admin/ban", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: banType, value: banValue, reason: banReason }),
      });
      if (res.ok) {
        setBanValue("");
        setBanReason("");
        loadData();
      }
    } catch {}
  }

  async function handleUnban(id: string) {
    try {
      const res = await fetch(`/api/admin/unban/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.ok) loadData();
    } catch {}
  }

  const filteredUsers = users.filter(
    (u) =>
      u.email.includes(searchQuery) ||
      u.id.includes(searchQuery) ||
      u.ip.includes(searchQuery),
  );

  return (
    <div className="space-y-6">
      <h2 className="heading-display">User Management</h2>

      {/* Ban Section */}
      <div className="glass-panel">
        <h3 className="mb-4 flex items-center gap-2 heading-display">
          <Ban className="h-5 w-5 text-[color:var(--danger)]" />
          Ban User / IP / Email
        </h3>
        <div className="flex flex-col gap-3 sm:flex-row">
          <select
            value={banType}
            onChange={(e) => setBanType(e.target.value as typeof banType)}
            className="input-field w-auto"
          >
            <option value="user">User ID</option>
            <option value="ip">IP Address</option>
            <option value="email">Email</option>
          </select>
          <input
            type="text"
            value={banValue}
            onChange={(e) => setBanValue(e.target.value)}
            placeholder={banType === "ip" ? "192.168.1.1" : banType === "email" ? "user@example.com" : "user-id"}
            className="input-field flex-1"
          />
          <input
            type="text"
            value={banReason}
            onChange={(e) => setBanReason(e.target.value)}
            placeholder="Reason (optional)"
            className="input-field flex-1"
          />
          <button onClick={handleBan} className="btn-premium-danger">
            <Ban className="mr-2 h-4 w-4" />
            Ban
          </button>
        </div>
      </div>

      {/* Banned List */}
      <div className="glass-panel">
        <h3 className="mb-4 flex items-center gap-2 heading-display">
          <ShieldOff className="h-5 w-5 text-[color:var(--danger)]" />
          Banned Entries ({bannedList.length})
        </h3>
        {bannedList.length === 0 ? (
          <p className="text-sm text-[color:var(--text-tertiary)]">No bans active.</p>
        ) : (
          <div className="space-y-2">
            {bannedList.map((entry) => (
              <div
                key={entry.id}
                className="flex items-center justify-between rounded-lg border border-[color:var(--border)] bg-[color:var(--surface-inset)] px-3 py-2"
              >
                <div className="flex items-center gap-3">
                  <span className="rounded-full bg-[color:var(--danger-soft)] px-2 py-0.5 text-xs font-medium text-[color:var(--danger)]">
                    {entry.type.toUpperCase()}
                  </span>
                  <span className="font-mono text-sm text-[color:var(--text-primary)]">{entry.value}</span>
                  {entry.reason && (
                    <span className="text-xs text-[color:var(--text-tertiary)]">— {entry.reason}</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[color:var(--text-tertiary)]">
                    {new Date(entry.bannedAt).toLocaleDateString()}
                  </span>
                  <button
                    onClick={() => handleUnban(entry.id)}
                    className="rounded-lg p-1.5 text-[color:var(--success)] hover:bg-[color:var(--success-soft)]"
                    title="Unban"
                  >
                    <Shield className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Users List */}
      <div className="glass-panel">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="flex items-center gap-2 heading-display">
            <Users className="h-5 w-5 text-[color:var(--accent-text)]" />
            Users ({users.length})
          </h3>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--text-tertiary)]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search..."
              className="input-field pl-9"
            />
          </div>
        </div>
        {loading ? (
          <p className="text-sm text-[color:var(--text-tertiary)]">Loading...</p>
        ) : filteredUsers.length === 0 ? (
          <p className="text-sm text-[color:var(--text-tertiary)]">
            {searchQuery ? "No users match search." : "No users yet. Users will appear when they sign up."}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[color:var(--border)] text-left text-xs uppercase tracking-wider text-[color:var(--text-tertiary)]">
                  <th className="pb-2 pr-4">ID</th>
                  <th className="pb-2 pr-4">Email</th>
                  <th className="pb-2 pr-4">Role</th>
                  <th className="pb-2 pr-4">Credits</th>
                  <th className="pb-2 pr-4">IP</th>
                  <th className="pb-2 pr-4">Created</th>
                  <th className="pb-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr
                    key={user.id}
                    className="border-b border-[color:var(--border)] last:border-0"
                  >
                    <td className="py-2.5 pr-4 font-mono text-xs text-[color:var(--text-tertiary)]">
                      {user.id.slice(0, 8)}…
                    </td>
                    <td className="py-2.5 pr-4 text-[color:var(--text-primary)]">{user.email || "—"}</td>
                    <td className="py-2.5 pr-4">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          user.role === "admin"
                            ? "bg-[color:var(--accent-soft)] text-[color:var(--accent-text)]"
                            : "bg-[color:var(--surface-1)] text-[color:var(--text-secondary)]"
                        }`}
                      >
                        {user.role}
                      </span>
                    </td>
                    <td className="py-2.5 pr-4 text-[color:var(--text-primary)]">{user.credits}</td>
                    <td className="py-2.5 pr-4 font-mono text-xs text-[color:var(--text-tertiary)]">{user.ip || "—"}</td>
                    <td className="py-2.5 pr-4 text-xs text-[color:var(--text-tertiary)]">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-2.5">
                      <div className="flex gap-1">
                        <button
                          onClick={() => {
                            setBanType("user");
                            setBanValue(user.id);
                            setBanReason("");
                          }}
                          className="rounded p-1.5 text-[color:var(--danger)] hover:bg-[color:var(--danger-soft)]"
                          title="Ban user"
                        >
                          <UserX className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function Users(props: { className?: string }) {
  return <UsersIcon {...props} />;
}
function UsersIcon(props: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={props.className}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
  );
}
