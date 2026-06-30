import type { LengthCheck } from "../types.js";
import type { ParsedEmail } from "./normalize.js";

// RFC 5321 limits.
const MAX_LOCAL = 64;
const MAX_DOMAIN = 255;
const MAX_TOTAL = 254;

/**
 * Enforce RFC 5321 length constraints. Uses the ASCII (punycode) domain because
 * that is what actually travels on the wire.
 */
export function checkLength(parsed: ParsedEmail | null): LengthCheck {
  if (!parsed) {
    return {
      valid: false,
      localPartLength: 0,
      domainLength: 0,
      totalLength: 0,
      reason: "Unparseable address",
    };
  }

  const localPartLength = parsed.localPart.length;
  const domainLength = parsed.asciiDomain.length;
  const totalLength = localPartLength + 1 + domainLength;

  const problems: string[] = [];
  if (localPartLength > MAX_LOCAL) {
    problems.push(`local part exceeds ${MAX_LOCAL} chars`);
  }
  if (domainLength > MAX_DOMAIN) {
    problems.push(`domain exceeds ${MAX_DOMAIN} chars`);
  }
  if (totalLength > MAX_TOTAL) {
    problems.push(`address exceeds ${MAX_TOTAL} chars`);
  }

  return {
    valid: problems.length === 0,
    localPartLength,
    domainLength,
    totalLength,
    reason: problems.length ? problems.join("; ") : undefined,
  };
}
