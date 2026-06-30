import type {
  VerificationChecks,
  VerificationStatus,
} from "../types.js";

export interface ScoreResult {
  score: number;
  status: VerificationStatus;
  reasons: string[];
}

/**
 * Derive a 0-100 confidence score and a final verdict from the individual
 * checks.
 *
 *  - A failed syntax, length, or domain check is disqualifying -> "invalid".
 *  - Disposable / null-MX / role / typo signals lower the score and can push an
 *    otherwise-valid address into "risky".
 */
export function scoreChecks(
  checks: VerificationChecks,
  dnsChecked: boolean,
): ScoreResult {
  const reasons: string[] = [];

  // Hard failures.
  if (!checks.syntax.valid) {
    return {
      score: 0,
      status: "invalid",
      reasons: [checks.syntax.reason ?? "Invalid syntax"],
    };
  }
  if (!checks.length.valid) {
    return {
      score: 0,
      status: "invalid",
      reasons: [checks.length.reason ?? "Invalid length"],
    };
  }

  if (dnsChecked) {
    if (checks.domain.nullMx) {
      return {
        score: 0,
        status: "invalid",
        reasons: ["Domain advertises a null MX and accepts no mail"],
      };
    }
    if (!checks.domain.resolvable) {
      return {
        score: 0,
        status: "invalid",
        reasons: [checks.domain.reason ?? "Domain has no mail records"],
      };
    }
  }

  // Start from full confidence and subtract for soft signals.
  let score = 100;

  if (dnsChecked) {
    if (checks.domain.hasMx) {
      reasons.push("Domain has MX records");
    } else if (checks.domain.hasAddressRecord) {
      score -= 10;
      reasons.push("Domain has no MX; falling back to A/AAAA record");
    }
  } else {
    score -= 5;
    reasons.push("DNS not checked (offline mode)");
  }

  if (checks.disposable.isDisposable) {
    score -= 50;
    reasons.push("Disposable / temporary email domain");
  }

  if (checks.typo.hasSuggestion) {
    score -= 25;
    reasons.push(`Possible typo; did you mean ${checks.typo.suggestion}?`);
  }

  if (checks.role.isRoleAccount) {
    score -= 15;
    reasons.push("Role-based address (not an individual mailbox)");
  }

  if (checks.free.isFreeProvider) {
    // Informational only — free providers are perfectly deliverable.
    reasons.push("Free webmail provider");
  }

  score = Math.max(0, Math.min(100, score));

  // Map score to a verdict. Disposable or typo'd addresses land in "risky".
  let status: VerificationStatus;
  if (checks.disposable.isDisposable || score < 50) {
    status = "risky";
  } else if (score < 85) {
    status = "risky";
  } else {
    status = "valid";
  }

  return { score, status, reasons };
}
