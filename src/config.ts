export interface AppConfig {
  port: number;
  host: string;
  dnsTimeoutMs: number;
  /** Max number of emails accepted by the batch endpoint. */
  maxBatchSize: number;
  /** Accepted API keys. When empty, auth is disabled (dev only). */
  apiKeys: string[];
}

function intFromEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const value = Number.parseInt(raw, 10);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function listFromEnv(name: string): string[] {
  return (process.env[name] ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

export const config: AppConfig = {
  port: intFromEnv("PORT", 3000),
  host: process.env.HOST ?? "0.0.0.0",
  dnsTimeoutMs: intFromEnv("DNS_TIMEOUT_MS", 5000),
  maxBatchSize: intFromEnv("MAX_BATCH_SIZE", 100),
  apiKeys: listFromEnv("API_KEYS"),
};
