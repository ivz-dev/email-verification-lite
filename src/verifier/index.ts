import type {
  DomainCheck,
  VerificationChecks,
  VerificationResult,
  VerifyOptions,
} from "../types.js";
import { parseEmail } from "./normalize.js";
import { checkSyntax } from "./syntax.js";
import { checkLength } from "./length.js";
import { checkDomain } from "./domain.js";
import { checkDisposable, checkFreeProvider, checkRole } from "./lists.js";
import { checkTypo } from "./typo.js";
import { scoreChecks } from "./score.js";

const UNKNOWN_DOMAIN: DomainCheck = {
  resolvable: false,
  hasMx: false,
  mxRecords: [],
  hasAddressRecord: false,
  nullMx: false,
  reason: "DNS check skipped",
};

/**
 * Run every non-SMTP verification check against a single email address and
 * return a structured result with an aggregate score and verdict.
 */
export async function verifyEmail(
  rawEmail: string,
  options: VerifyOptions = {},
): Promise<VerificationResult> {
  const parsed = parseEmail(rawEmail);

  const syntax = checkSyntax(parsed);
  const length = checkLength(parsed);

  const asciiDomain = parsed?.asciiDomain ?? "";
  const localPart = parsed?.localPart ?? "";

  // Domain DNS check only runs when syntax is sound and not disabled.
  const dnsChecked = syntax.valid && !options.skipDns;
  const domain: DomainCheck = dnsChecked
    ? await checkDomain(asciiDomain, options.dnsTimeoutMs)
    : UNKNOWN_DOMAIN;

  const disposable = checkDisposable(asciiDomain);
  const free = checkFreeProvider(asciiDomain);
  const role = checkRole(localPart);
  const typo = syntax.valid
    ? checkTypo(localPart, asciiDomain)
    : { hasSuggestion: false };

  const checks: VerificationChecks = {
    syntax,
    length,
    domain,
    disposable,
    free,
    role,
    typo,
  };

  const { score, status, reasons } = scoreChecks(checks, dnsChecked);

  return {
    email: rawEmail,
    normalizedEmail: parsed?.normalized ?? rawEmail.trim().toLowerCase(),
    status,
    score,
    isValid: status === "valid",
    checks,
    reasons,
  };
}
