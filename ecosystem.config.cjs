module.exports = {
  apps: [{
    name: "trading-crm",
    script: "server/index.ts",
    interpreter: "tsx",
    env: {
      NODE_ENV: "production",
      PORT: "3001",
    },
    max_restarts: 10,
    restart_delay: 2000,
    watch: false,
  }],
};
