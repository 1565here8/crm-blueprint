/** Strip PII from error messages before any optional logging */
export function safeErrorMessage(err: unknown, fallback: string): string {
  if (!(err instanceof Error)) return fallback;
  const msg = err.message.slice(0, 200);
  if (/password|secret|token|email|@/i.test(msg)) return fallback;
  return msg;
}
