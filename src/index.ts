import { createApp } from "./server.js";
import { config } from "./config.js";

const app = createApp();

const server = app.listen(config.port, config.host, () => {
  console.log(
    `email-verification-lite listening on http://${config.host}:${config.port}`,
  );
});

// Graceful shutdown.
for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    console.log(`\nReceived ${signal}, shutting down...`);
    server.close(() => process.exit(0));
  });
}
