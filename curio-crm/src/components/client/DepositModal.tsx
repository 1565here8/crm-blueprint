import React, { useState } from "react";
import { CheckCircle2, Loader2, Wallet } from "lucide-react";
import { client, fmtMoney, type UserSummary } from "../../api/client";

type Props = {
  open: boolean;
  onClose: () => void;
  currency?: string;
  onSubmitted?: (user: UserSummary) => void;
};

const METHODS = ["Wire Transfer", "Bank Transfer", "Credit Card", "Crypto"] as const;

export function DepositModal({ open, onClose, currency = "USD", onSubmitted }: Props) {
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<(typeof METHODS)[number]>("Wire Transfer");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  if (!open) return null;

  function reset() {
    setAmount("");
    setMethod("Wire Transfer");
    setReference("");
    setNotes("");
    setError(null);
    setDone(false);
  }

  function handleClose() {
    reset();
    onClose();
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) {
      setError("Enter a valid deposit amount.");
      return;
    }
    setPending(true);
    setError(null);
    try {
      const data = await client.createDepositRequest({
        amount: value,
        method,
        reference: reference.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      setDone(true);
      onSubmitted?.(data.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Deposit request failed.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-center gap-3">
          <Wallet className="h-8 w-8 text-[#5eb8e8]" />
          <div>
            <h3 className="text-lg font-bold text-slate-800">Deposit funds</h3>
            <p className="text-sm text-slate-500">Secure funding request — processed by our cashier team</p>
          </div>
        </div>

        {done ? (
          <div className="text-center">
            <CheckCircle2 className="mx-auto h-12 w-12 text-teal-600" />
            <p className="mt-3 text-sm font-medium text-slate-800">Deposit request submitted</p>
            <p className="mt-2 text-sm text-slate-600">
              Your request is pending review. Approved funds will appear in your cash balance and transaction
              history.
            </p>
            <button
              type="button"
              onClick={handleClose}
              className="mt-5 w-full rounded-full bg-[#1a3a7a] py-2.5 text-sm font-semibold text-white hover:bg-[#152f66]"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={(e) => void submit(e)} className="space-y-4">
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-slate-700">Amount ({currency})</span>
              <input
                type="number"
                min="1"
                step="0.01"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-slate-800 focus:border-[#5eb8e8] focus:outline-none"
                placeholder={`e.g. ${fmtMoney(currency, 1000).replace(/[^\d.,]/g, "")}`}
              />
            </label>

            <label className="block text-sm">
              <span className="mb-1 block font-medium text-slate-700">Payment method</span>
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value as (typeof METHODS)[number])}
                className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-slate-800 focus:border-[#5eb8e8] focus:outline-none"
              >
                {METHODS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-sm">
              <span className="mb-1 block font-medium text-slate-700">Payment reference (optional)</span>
              <input
                type="text"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-slate-800 focus:border-[#5eb8e8] focus:outline-none"
                placeholder="Wire ref, TX hash, or receipt ID"
              />
            </label>

            <label className="block text-sm">
              <span className="mb-1 block font-medium text-slate-700">Notes (optional)</span>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-slate-800 focus:border-[#5eb8e8] focus:outline-none"
                placeholder="Additional instructions for the cashier"
              />
            </label>

            {error ? <p className="text-sm text-red-600">{error}</p> : null}

            <p className="text-xs leading-relaxed text-slate-500">
              Bank details for wire transfers are available in your profile under Transaction History. Card and
              crypto deposits are verified before crediting your account.
            </p>

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={handleClose}
                className="flex-1 rounded-full border border-slate-200 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={pending}
                className="flex flex-1 items-center justify-center gap-2 rounded-full bg-teal-600 py-2.5 text-sm font-semibold text-white hover:bg-teal-500 disabled:opacity-60"
              >
                {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Submit request
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
