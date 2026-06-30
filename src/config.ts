export interface AppConfig {
  port: number;
  host: string;
  dnsTimeoutMs: number;
  /** Max number of emails accepted by the batch endpoint. */
  maxBatchSize: number;
}

function intFromEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const value = Number.parseInt(raw, 10);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

export const config: AppConfig = {
  port: intFromEnv("PORT", 3000),
  host: process.env.HOST ?? "0.0.0.0",
  dnsTimeoutMs: intFromEnv("DNS_TIMEOUT_MS", 5000),
  maxBatchSize: intFromEnv("MAX_BATCH_SIZE", 100),
};
