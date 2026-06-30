import { existsSync } from "node:fs";

/**
 * Load a .env file into process.env, regardless of how the app is launched
 * (node, tsx, PM2, Docker...). This must be imported BEFORE config.ts so the
 * variables are present when config is evaluated.
 *
 * The path can be overridden with ENV_FILE; missing files are ignored. Existing
 * process.env values always win, so PM2/shell-provided vars are not clobbered.
 */
const envFile = process.env.ENV_FILE ?? ".env";

if (existsSync(envFile)) {
  process.loadEnvFile(envFile);
  console.log(`Loaded environment from ${envFile}`);
}
