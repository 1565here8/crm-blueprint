import { performance } from "node:perf_hooks";

const model = process.argv[2] ?? "qwen2.5:0.5b";
const t0 = performance.now();
const r = await fetch("http://127.0.0.1:11434/api/chat", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({
    model,
    messages: [{ role: "user", content: "Hello" }],
    stream: false,
    options: { num_predict: 25, num_ctx: 512 },
  }),
});
const ms = Math.round(performance.now() - t0);
const j = await r.json();
console.log(JSON.stringify({ ok: r.ok, ms, model, reply: j.message?.content?.slice(0, 80) ?? j.error }));
