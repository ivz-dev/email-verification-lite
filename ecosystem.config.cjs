// PM2 process configuration for production.
// Runs the compiled app from dist/ (run `npm run build` first).
//
// No environment values live here on purpose: the app loads its own .env at
// startup (see src/env.ts), so secrets/config stay in one place — the .env file.
module.exports = {
  apps: [
    {
      name: "email-verification-lite",
      script: "dist/index.js",
      // Run from the project root so the relative .env is found.
      cwd: __dirname,
      // Cluster mode: spread load across all CPU cores.
      instances: "max",
      exec_mode: "cluster",
      // Restart policy.
      autorestart: true,
      max_restarts: 10,
      min_uptime: "10s",
      max_memory_restart: "300M",
    },
  ],
};
