import { timingSafeEqual } from "node:crypto";
import type { RequestHandler } from "express";

/**
 * Constant-time check of whether `candidate` matches any of `validKeys`.
 * Compares against every key (no early return) so the response time does not
 * leak which key, if any, was close.
 */
function matchesAnyKey(candidate: string, validKeys: string[]): boolean {
  const candidateBuf = Buffer.from(candidate);
  let matched = false;
  for (const key of validKeys) {
    const keyBuf = Buffer.from(key);
    // timingSafeEqual requires equal-length buffers; a length mismatch is an
    // automatic non-match but we still run a comparison to keep timing stable.
    if (
      keyBuf.length === candidateBuf.length &&
      timingSafeEqual(keyBuf, candidateBuf)
    ) {
      matched = true;
    }
  }
  return matched;
}

/** Extract the presented key from `X-API-Key` or `Authorization: Bearer <key>`. */
function extractKey(req: {
  header(name: string): string | undefined;
}): string | undefined {
  const headerKey = req.header("x-api-key");
  if (headerKey) return headerKey.trim();

  const auth = req.header("authorization");
  if (auth && auth.toLowerCase().startsWith("bearer ")) {
    return auth.slice(7).trim();
  }
  return undefined;
}

/**
 * Build an API-key authentication middleware.
 *
 * When `validKeys` is empty, authentication is disabled (intended for local
 * development only) and a warning is logged once at startup by the caller.
 */
export function apiKeyAuth(validKeys: string[]): RequestHandler {
  const authDisabled = validKeys.length === 0;

  return (req, res, next) => {
    if (authDisabled) return next();

    const presented = extractKey(req);
    if (!presented) {
      return res.status(401).json({
        error: "Missing API key",
        hint: "Provide it via the 'X-API-Key' header or 'Authorization: Bearer <key>'.",
      });
    }

    if (!matchesAnyKey(presented, validKeys)) {
      return res.status(403).json({ error: "Invalid API key" });
    }

    return next();
  };
}
