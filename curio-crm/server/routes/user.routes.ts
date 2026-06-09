import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../auth";
import { getLedger, getPositionById, listUserPendingOrders, listClosedPositionsRich, listUserDocuments, createUserDocument, listUserWireRequests, createWireRequest, ledgerToTransactions, getUserProfileSummary, withdrawToCredits, createDepositRequest, listUserDepositRequests } from "../db";
import { getExecutions, placeOrder, cancelUserPendingOrder, userSummary, updatePositionStops } from "../trading";
import { getQuote } from "../marketData";

const orderSchema = z.object({
  symbol: z.string().min(1).max(32),
  assetClass: z.enum(["us_equity", "crypto"]),
  qty: z.number().positive().max(1_000_000),
  side: z.enum(["BUY", "SELL"]),
  orderType: z.enum(["MARKET", "LIMIT"]).default("MARKET"),
  limitPrice: z.number().positive().optional(),
  positionId: z.string().uuid().optional(),
});

const withdrawSchema = z.object({
  amount: z.number().positive().max(1_000_000_000),
});

export const userRouter = Router();

userRouter.use(requireAuth);

userRouter.get("/me", async (req, res) => {
  res.json({ user: await userSummary(req.sessionUser!.id) });
});

userRouter.get("/pending", async (req, res) => {
  await userSummary(req.sessionUser!.id);
  res.json({ orders: listUserPendingOrders(req.sessionUser!.id) });
});

userRouter.get("/executions", (req, res) => {
  res.json({ executions: getExecutions(req.sessionUser!.id) });
});

userRouter.get("/history", (req, res) => {
  res.json({ closedPositions: listClosedPositionsRich(req.sessionUser!.id) });
});

userRouter.get("/ledger", (req, res) => {
  res.json({ entries: getLedger(req.sessionUser!.id) });
});

userRouter.get("/transactions", (req, res) => {
  const userId = req.sessionUser!.id;
  const profile = getUserProfileSummary(userId);
  const entries = getLedger(userId, 100);
  const wirePending = listUserWireRequests(userId)
    .filter((w) => w.status === "pending")
    .map((w) => ({
      id: w.id,
      date: w.created_at.slice(0, 10),
      type: "WITHDRAWAL" as const,
      method: "Wire Transfer",
      status: "PENDING" as const,
      amount: w.amount,
      currency: profile.currency,
    }));
  const depositPending = listUserDepositRequests(userId)
    .filter((d) => d.status === "pending")
    .map((d) => ({
      id: d.id,
      date: d.created_at.slice(0, 10),
      type: "DEPOSIT" as const,
      method: d.method,
      status: "PENDING" as const,
      amount: d.amount,
      currency: profile.currency,
    }));
  const approved = ledgerToTransactions(entries, profile.currency);
  res.json({
    transactions: [...depositPending, ...wirePending, ...approved].sort((a, b) => b.date.localeCompare(a.date)),
  });
});

userRouter.get("/documents", (req, res) => {
  res.json({ documents: listUserDocuments(req.sessionUser!.id) });
});

userRouter.post("/documents", (req, res) => {
  const parsed = z
    .object({
      docType: z.string().min(1).max(64),
      fileName: z.string().min(1).max(256),
      notes: z.string().max(500).optional(),
    })
    .safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid document payload." });
    return;
  }
  const doc = createUserDocument({
    userId: req.sessionUser!.id,
    docType: parsed.data.docType,
    fileName: parsed.data.fileName,
    notes: parsed.data.notes,
  });
  res.status(201).json({ document: doc });
});

userRouter.get("/wire-requests", (req, res) => {
  res.json({ requests: listUserWireRequests(req.sessionUser!.id) });
});

userRouter.post("/wire-requests", async (req, res) => {
  const parsed = z
    .object({
      amount: z.number().positive().max(1_000_000_000),
      bankDetails: z.string().min(4).max(2000),
    })
    .safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid wire request." });
    return;
  }
  try {
    const request = createWireRequest({
      userId: req.sessionUser!.id,
      amount: parsed.data.amount,
      bankDetails: parsed.data.bankDetails,
    });
    res.status(201).json({ request, user: await userSummary(req.sessionUser!.id) });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : "Wire request failed." });
  }
});

userRouter.get("/deposit-requests", (req, res) => {
  res.json({ requests: listUserDepositRequests(req.sessionUser!.id) });
});

userRouter.post("/deposit-requests", async (req, res) => {
  const parsed = z
    .object({
      amount: z.number().positive().max(1_000_000_000),
      method: z.enum(["Wire Transfer", "Bank Transfer", "Credit Card", "Crypto"]),
      reference: z.string().max(128).optional(),
      notes: z.string().max(500).optional(),
    })
    .safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid deposit request." });
    return;
  }
  try {
    const request = createDepositRequest({
      userId: req.sessionUser!.id,
      amount: parsed.data.amount,
      method: parsed.data.method,
      reference: parsed.data.reference,
      notes: parsed.data.notes,
    });
    res.status(201).json({ request, user: await userSummary(req.sessionUser!.id) });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : "Deposit request failed." });
  }
});

userRouter.get("/quote-preview", async (req, res) => {
  const parsed = z
    .object({
      symbol: z.string().min(1),
      assetClass: z.enum(["us_equity", "crypto"]),
    })
    .safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid symbol." });
    return;
  }
  const quote = await getQuote(parsed.data.symbol, parsed.data.assetClass);
  res.json({ quote });
});

userRouter.post("/orders", async (req, res) => {
  const parsed = orderSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  try {
    const result = await placeOrder({
      userId: req.sessionUser!.id,
      symbol: parsed.data.symbol,
      assetClass: parsed.data.assetClass,
      qty: parsed.data.qty,
      side: parsed.data.side,
      orderType: parsed.data.orderType,
      limitPrice: parsed.data.limitPrice,
      positionId: parsed.data.positionId,
      actorId: req.sessionUser!.id,
    });

    const account = await userSummary(req.sessionUser!.id);

    if (result.kind === "pending") {
      res.status(201).json({
        pending: true,
        order: result.pendingOrder,
        account,
      });
      return;
    }

    res.status(201).json({
      execution: result.execution,
      position: result.position ?? result.closed,
      fill: {
        side: result.execution.side,
        symbol: result.execution.symbol,
        qty: result.execution.qty,
        price: result.execution.fill_price,
        notional: result.execution.notional,
        orderType: result.execution.order_type,
        filledAt: result.execution.created_at,
      },
      account,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Order rejected.";
    res.status(400).json({ error: message });
  }
});

userRouter.post("/trades/open", async (req, res) => {
  const body = z
    .object({
      symbol: z.string().min(1).max(32),
      assetClass: z.enum(["us_equity", "crypto"]),
      qty: z.number().positive().max(1_000_000),
    })
    .safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.flatten() });
    return;
  }
  req.body = { ...body.data, side: "BUY", orderType: "MARKET" };
  const parsed = orderSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  try {
    const result = await placeOrder({
      userId: req.sessionUser!.id,
      symbol: parsed.data.symbol,
      assetClass: parsed.data.assetClass,
      qty: parsed.data.qty,
      side: "BUY",
      orderType: "MARKET",
      actorId: req.sessionUser!.id,
    });
    if (result.kind === "pending") {
      res.status(201).json({ pending: true, order: result.pendingOrder, user: await userSummary(req.sessionUser!.id) });
      return;
    }
    res.status(201).json({ position: result.position, user: await userSummary(req.sessionUser!.id) });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : "Order failed." });
  }
});

userRouter.post("/trades/close", async (req, res) => {
  const parsed = z.object({ positionId: z.string().uuid() }).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const position = getPositionById(parsed.data.positionId);
  if (!position || position.user_id !== req.sessionUser!.id) {
    res.status(403).json({ error: "Not your position." });
    return;
  }
  try {
    const result = await placeOrder({
      userId: req.sessionUser!.id,
      symbol: position.symbol,
      assetClass: position.asset_class,
      qty: position.qty,
      side: "SELL",
      orderType: "MARKET",
      positionId: parsed.data.positionId,
      actorId: req.sessionUser!.id,
    });
    if (result.kind === "pending") {
      res.json({ pending: true, order: result.pendingOrder, user: await userSummary(req.sessionUser!.id) });
      return;
    }
    res.json({ position: result.closed, user: await userSummary(req.sessionUser!.id) });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : "Close failed." });
  }
});

userRouter.delete("/pending/:id", async (req, res) => {
  try {
    const order = await cancelUserPendingOrder(req.sessionUser!.id, req.params.id);
    res.json({ order, account: await userSummary(req.sessionUser!.id) });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : "Cancel failed." });
  }
});

userRouter.patch("/positions/:id/stops", async (req, res) => {
  const parsed = z
    .object({
      stopLoss: z.number().positive().nullable().optional(),
      takeProfit: z.number().positive().nullable().optional(),
    })
    .safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  try {
    const position = updatePositionStops(
      req.params.id,
      req.sessionUser!.id,
      parsed.data.stopLoss ?? null,
      parsed.data.takeProfit ?? null,
    );
    res.json({ position, user: await userSummary(req.sessionUser!.id) });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : "Update failed." });
  }
});

userRouter.post("/withdraw", async (req, res) => {
  const parsed = withdrawSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  try {
    const result = withdrawToCredits({ userId: req.sessionUser!.id, amount: parsed.data.amount });
    res.json({ ...result, user: await userSummary(req.sessionUser!.id) });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Withdraw failed.";
    res.status(400).json({ error: message });
  }
});
