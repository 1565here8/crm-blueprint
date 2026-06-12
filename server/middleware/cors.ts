import cors from "cors";

export function buildCorsMiddleware() {
  const origins = process.env.CORS_ORIGIN?.split(",").map((s) => s.trim()).filter(Boolean);
  return cors({
    origin: origins?.length ? origins : process.env.NODE_ENV === "production" ? false : true,
    credentials: true,
  });
}
