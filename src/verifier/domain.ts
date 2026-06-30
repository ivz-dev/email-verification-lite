import dns from "node:dns/promises";
import type { MxRecord } from "node:dns";
import type { DomainCheck } from "../types.js";

const DEFAULT_DNS_TIMEOUT_MS = 5000;

/** Race a promise against a timeout, resolving to `fallback` if it expires. */
async function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  fallback: T,
): Promise<T> {
  let timer: NodeJS.Timeout;
  const timeout = new Promise<T>((resolve) => {
    timer = setTimeout(() => resolve(fallback), ms);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(timer!);
  }
}

/** DNS errors that mean "looked up fine, nothing there" rather than a failure. */
const EMPTY_CODES = new Set(["ENODATA", "ENOTFOUND"]);

async function resolveMx(
  domain: string,
): Promise<{ records: MxRecord[]; nxdomain: boolean }> {
  try {
    const records = await dns.resolveMx(domain);
    return { records, nxdomain: false };
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code ?? "";
    return { records: [], nxdomain: code === "ENOTFOUND" };
  }
}

async function hasAnyAddress(domain: string): Promise<boolean> {
  const tryResolve = async (fn: () => Promise<unknown[]>): Promise<boolean> => {
    try {
      const result = await fn();
      return result.length > 0;
    } catch (err) {
      const code = (err as NodeJS.ErrnoException).code ?? "";
      if (EMPTY_CODES.has(code)) return false;
      throw err;
    }
  };

  const [v4, v6] = await Promise.all([
    tryResolve(() => dns.resolve4(domain)),
    tryResolve(() => dns.resolve6(domain)).catch(() => false),
  ]);
  return v4 || v6;
}

/**
 * Resolve the deliverability of a domain via DNS (no SMTP).
 *
 * Logic follows RFC 5321 §5: prefer MX records; if absent, an A/AAAA record
 * makes the domain an implicit mail target. An MX record of "." is a null MX
 * (RFC 7505) meaning the domain explicitly accepts no mail.
 */
export async function checkDomain(
  asciiDomain: string,
  timeoutMs: number = DEFAULT_DNS_TIMEOUT_MS,
): Promise<DomainCheck> {
  const empty: DomainCheck = {
    resolvable: false,
    hasMx: false,
    mxRecords: [],
    hasAddressRecord: false,
    nullMx: false,
    reason: "DNS lookup timed out",
  };

  const result = await withTimeout(
    (async (): Promise<DomainCheck> => {
      const { records, nxdomain } = await resolveMx(asciiDomain);

      if (nxdomain) {
        return {
          resolvable: false,
          hasMx: false,
          mxRecords: [],
          hasAddressRecord: false,
          nullMx: false,
          reason: "Domain does not exist (NXDOMAIN)",
        };
      }

      // RFC 7505 null MX: a single record with an empty/"." exchange.
      const nullMx =
        records.length === 1 &&
        (records[0]!.exchange === "" || records[0]!.exchange === ".");

      const mxRecords = nullMx
        ? []
        : [...records]
            .sort((a, b) => a.priority - b.priority)
            .map((r) => r.exchange);

      const hasMx = mxRecords.length > 0;

      let hasAddressRecord = false;
      if (!hasMx && !nullMx) {
        hasAddressRecord = await hasAnyAddress(asciiDomain);
      }

      const resolvable = hasMx || hasAddressRecord;
      let reason: string | undefined;
      if (nullMx) reason = "Domain advertises a null MX (accepts no mail)";
      else if (!resolvable) reason = "No MX or A/AAAA records found";

      return {
        resolvable,
        hasMx,
        mxRecords,
        hasAddressRecord,
        nullMx,
        reason,
      };
    })(),
    timeoutMs,
    empty,
  );

  return result;
}
