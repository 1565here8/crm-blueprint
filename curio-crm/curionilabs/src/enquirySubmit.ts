export type EnquiryPayload = {
  name: string;
  email: string;
  phone: string;
  company: string;
  market: "fx" | "crypto" | "both" | "other";
  message: string;
};

const FORM_EMAIL = "hello@curionilabs.com";

/** Production static site (Porkbun) — no Node server. */
async function submitViaFormSubmit(form: EnquiryPayload): Promise<{ ok: boolean; message?: string; error?: string }> {
  const body = {
    name: form.name,
    email: form.email,
    phone: form.phone,
    company: form.company,
    market: form.market,
    message: [
      form.message.trim(),
      `Company: ${form.company}`,
      `Market: ${form.market}`,
      form.phone ? `Phone: ${form.phone}` : "",
    ]
      .filter(Boolean)
      .join("\n"),
    _subject: `Desk CRM enquiry — ${form.company}`,
    _captcha: "false",
  };

  const res = await fetch(`https://formsubmit.co/ajax/${FORM_EMAIL}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    return { ok: false, error: "Could not send — email hello@curionilabs.com" };
  }
  return { ok: true, message: "Thank you — we will call you within one business day." };
}

/** Local dev — Express + SQLite on :3010 */
async function submitViaApi(form: EnquiryPayload): Promise<{ ok: boolean; message?: string; error?: string }> {
  const res = await fetch("/api/enquiry", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(form),
  });
  return (await res.json()) as { ok?: boolean; message?: string; error?: string };
}

export async function submitEnquiry(form: EnquiryPayload) {
  const data = import.meta.env.DEV ? await submitViaApi(form) : await submitViaFormSubmit(form);
  if (data.ok) {
    return { ok: true as const, text: data.message ?? "Thank you — we will call you within one business day." };
  }
  return { ok: false as const, text: data.error ?? "Please check your details and try again." };
}
