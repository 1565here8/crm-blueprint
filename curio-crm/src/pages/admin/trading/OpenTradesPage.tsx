import React, { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { AdminTradingHeader, TradingDesk } from "../../../components/TradingDesk";
import { client, type CrmUser } from "../../../api/client";

export function OpenTradesPage() {
  const [searchParams] = useSearchParams();
  const initialCustomer = searchParams.get("customer") ?? searchParams.get("user") ?? "";
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [activeUser, setActiveUser] = useState<CrmUser | null>(null);
  const [customerId, setCustomerId] = useState(initialCustomer);
  const [exclude, setExclude] = useState(false);
  const [crmUsers, setCrmUsers] = useState<CrmUser[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void client.adminCrmUsers({ limit: 500 }).then((r) => setCrmUsers(r.users)).catch(() => null);
  }, []);

  const resolveUsers = useCallback(
    (rawInput?: string) => {
      const raw = (rawInput ?? customerId).trim();
      if (!raw) {
        setError("Enter a customer display ID or user UUID.");
        return;
      }

      const byDisplay = crmUsers.filter((u) => String(u.displayId) === raw || u.id === raw);
      const ids = byDisplay.map((u) => u.id);

      if (ids.length === 0) {
        setError(`No user found for "${raw}".`);
        return;
      }

      setError(null);
      if (exclude) {
        setSelectedUserIds(crmUsers.filter((u) => !ids.includes(u.id)).map((u) => u.id));
        setActiveUser(null);
      } else {
        setSelectedUserIds(ids);
        setActiveUser(byDisplay[0] ?? null);
      }
    },
    [customerId, exclude, crmUsers],
  );

  useEffect(() => {
    if (!initialCustomer.trim() || crmUsers.length === 0) return;
    setCustomerId(initialCustomer.trim());
    resolveUsers(initialCustomer.trim());
  }, [initialCustomer, crmUsers, resolveUsers]);

  return (
    <div className="p-4">
      {error ? (
        <div className="mb-3 rounded border border-red-900/40 bg-red-950/20 px-4 py-2 text-sm text-red-300">
          {error}
        </div>
      ) : null}

      <TradingDesk
        mode="admin"
        selectedUserIds={selectedUserIds}
        activeTradeUserId={activeUser?.id ?? selectedUserIds[0]}
        adminHeader={
          <AdminTradingHeader
            userCount={selectedUserIds.length}
            customerId={customerId}
            exclude={exclude}
            activeClient={
              activeUser
                ? `#${activeUser.displayId} ${activeUser.username}`
                : selectedUserIds.length === 1
                  ? "1 client loaded"
                  : undefined
            }
            onCustomerIdChange={setCustomerId}
            onExcludeChange={setExclude}
            onSetUsers={() => resolveUsers()}
            onReset={() => {
              setSelectedUserIds([]);
              setActiveUser(null);
              setCustomerId("");
              setExclude(false);
              setError(null);
            }}
          />
        }
      />
    </div>
  );
}
