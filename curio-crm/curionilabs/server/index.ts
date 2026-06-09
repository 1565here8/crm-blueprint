import "dotenv/config";
import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import path from "path";
import { fileURLToPath } from "url";
import { enquiryRouter } from "./routes/enquiry.routes";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.CURIONILABS_PORT ?? 3010);
const isDev = process.env.NODE_ENV !== "production";

const app = express();

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: isDev }));
app.use(express.json({ limit: "32kb" }));

app.use(
  rateLimit({
    windowMs: 60_000,
    max: isDev ? 500 : 60,
    standardHeaders: true,
    legacyHeaders: false,
  }),
);

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "curionilabs" });
});

app.use("/api/enquiry", enquiryRouter);

const dist = path.join(__dirname, "..", "dist");
app.use(express.static(dist, { index: false }));

app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api")) return next();
  res.sendFile(path.join(dist, "index.html"), (err) => {
    if (err) next();
  });
});

app.listen(PORT, () => {
  console.log(`[curionilabs] listening :${PORT}`);
});
