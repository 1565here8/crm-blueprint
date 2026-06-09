/** PM2 process config — used on Curioni Labs VPS */
module.exports = {
  apps: [
    {
      name: "curiocrm",
      script: "npm",
      args: "start",
      env: {
        NODE_ENV: "production",
        PORT: "3002",
        SILENT_MODE: "1",
        LOG_LEVEL: "error",
        OLLAMA_BASE_URL: "http://127.0.0.1:11434",
        /** CRM instant replies only — tiny model, on-demand */
        OLLAMA_MODEL: "qwen2.5:0.5b",
        OLLAMA_DESK_FAST_MODEL: "qwen2.5:0.5b",
        /** Sovereign desk brain — provision-desk-ai.sh sets tier from VPS RAM */
        OLLAMA_DESK_SMART_MODEL: "qwen2.5:32b",
        OLLAMA_CONCIERGE_MODEL: "qwen2.5:0.5b",
        OLLAMA_NUM_CTX: "1024",
        OLLAMA_DESK_FAST_NUM_CTX: "512",
        OLLAMA_DESK_SMART_NUM_CTX: "8192",
        OLLAMA_CONCIERGE_NUM_CTX: "384",
        OLLAMA_NUM_THREAD: "8",
        OLLAMA_TIMEOUT_MS: "30000",
        OLLAMA_DESK_FAST_TIMEOUT_MS: "25000",
        OLLAMA_DESK_SMART_TIMEOUT_MS: "180000",
        OLLAMA_CONCIERGE_TIMEOUT_MS: "20000",
        DRIP_ENABLED: "0",
        SEARCH_INDEXING_ENABLED: "0",
        /** Public www live for demo — set to 1 only for maintenance gate */
        PUBLIC_SITE_REBRANDING: "0",
        PUBLIC_SITE_OFFLINE: "0",
        PUBLIC_SITE_URL: "https://www.curionilabs.com",
        ADMIN_URL: "https://admin.curionilabs.com",
      },
      max_restarts: 10,
      restart_delay: 3000,
    },
  ],
};
