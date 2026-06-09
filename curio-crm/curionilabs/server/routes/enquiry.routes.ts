import { randomUUID } from "crypto";
import { Router } from "express";
import { z } from "zod";
import { insertEnquiry } from "../db";

export const enquiryRouter = Router();

const schema = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email().max(200),
  phone: z.string().max(40).optional(),
  company: z.string().min(2).max(200),
  market: z.enum(["fx", "crypto", "both", "other"]).optional(),
  message: z.string().max(4000).optional(),
});

enquiryRouter.post("/", (req, res) => {
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ ok: false, error: "Please check your details and try again." });
    return;
  }
  try {
    insertEnquiry({
      id: randomUUID(),
      name: parsed.data.name.trim(),
      email: parsed.data.email.trim().toLowerCase(),
      phone: parsed.data.phone?.trim() || null,
      company: parsed.data.company.trim(),
      market: parsed.data.market ?? null,
      message: parsed.data.message?.trim() || null,
    });
    res.json({
      ok: true,
      message: "Thank you — our team will reach out within one business day.",
    });
  } catch {
    res.status(500).json({ ok: false, error: "Could not save your enquiry. Please email hello@curionilabs.com" });
  }
});
