import dotenv from "dotenv";
import { createApp } from "./app";

dotenv.config();

const port = Number(process.env.PORT ?? 3001);

const app = await createApp();

app.listen(port, () => {
  console.log(`[trading-crm] server http://localhost:${port}`);
});
