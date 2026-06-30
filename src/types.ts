/** Overall verdict for an email address. */
export type VerificationStatus = "valid" | "risky" | "invalid";

export interface SyntaxCheck {
  /** Whether the address matches an acceptable RFC 5322 shape. */
  valid: boolean;
  /** Human-readable reason when invalid. */
  reason?: string;
  localPart?: string;
  domain?: string;
}

export interface LengthCheck {
  valid: boolean;
  /** Length of the local part (before @). Max 64 per RFC 5321. */
  localPartLength: number;
  /** Length of the domain part (after @). Max 255 per RFC 5321. */
  domainLength: number;
  /** Total length. Max 254 per RFC 5321 for a deliverable address. */
  totalLength: number;
  reason?: string;
}

export interface DomainCheck {
  /** Domain resolves to at least one mail or address record. */
  resolvable: boolean;
  /** Domain has MX records. */
  hasMx: boolean;
  /** MX hostnames sorted by priority. */
  mxRecords: string[];
  /** Domain has A/AAAA records (fallback mail target per RFC 5321 §5). */
  hasAddressRecord: boolean;
  /** True if MX explicitly points to "." (RFC 7505 null MX — domain accepts no mail). */
  nullMx: boolean;
  reason?: string;
}

export interface DisposableCheck {
  isDisposable: boolean;
}

export interface FreeProviderCheck {
  isFreeProvider: boolean;
}

export interface RoleCheck {
  isRoleAccount: boolean;
}

export interface TypoCheck {
  /** True when a likely typo in the domain was detected. */
  hasSuggestion: boolean;
  /** Suggested corrected email address, if any. */
  suggestion?: string;
}

export interface VerificationChecks {
  syntax: SyntaxCheck;
  length: LengthCheck;
  domain: DomainCheck;
  disposable: DisposableCheck;
  free: FreeProviderCheck;
  role: RoleCheck;
  typo: TypoCheck;
}

export interface VerificationResult {
  /** The input email as received. */
  email: string;
  /** Lowercased, IDN-normalized form of the address. */
  normalizedEmail: string;
  /** Final verdict. */
  status: VerificationStatus;
  /** Confidence score 0-100. */
  score: number;
  /** Convenience flag: true only when status === "valid". */
  isValid: boolean;
  /** Per-check breakdown. */
  checks: VerificationChecks;
  /** Notes that explain how the score/status were derived. */
  reasons: string[];
}

export interface VerifyOptions {
  /** Skip DNS lookups (offline mode). Domain check is reported as unknown. */
  skipDns?: boolean;
  /** Timeout for DNS resolution in milliseconds. */
  dnsTimeoutMs?: number;
}
