// Must come first: loads .env into process.env before config is evaluated.
import "./env.js";
import { createApp } from "./server.js";
import { config } from "./config.js";

const app = createApp();

const server = app.listen(config.port, config.host, () => {
  console.log(
    `email-verification-lite listening on http://${config.host}:${config.port}`,
  );
  if (config.apiKeys.length === 0) {
    console.warn(
      "[WARN] No API_KEYS configured — authentication is DISABLED. Set API_KEYS for any non-local deployment.",
    );
  } else {
    console.log(`API key auth enabled (${config.apiKeys.length} key(s) loaded).`);
  }
});

// Graceful shutdown.
for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    console.log(`\nReceived ${signal}, shutting down...`);
    server.close(() => process.exit(0));
  });
}
