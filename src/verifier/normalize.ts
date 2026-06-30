import { domainToASCII } from "node:url";

export interface ParsedEmail {
  /** Local part exactly as written (case preserved). */
  localPart: string;
  /** Domain part exactly as written. */
  domain: string;
  /** ASCII (punycode) form of the domain, lowercased. */
  asciiDomain: string;
  /** Normalized address: original local part + "@" + lowercased ASCII domain. */
  normalized: string;
}

/**
 * Split an email into its local and domain parts on the LAST "@" so that quoted
 * local parts containing "@" are tolerated. Returns null if there is no "@" or
 * either side is empty.
 */
export function parseEmail(raw: string): ParsedEmail | null {
  const email = raw.trim();
  const at = email.lastIndexOf("@");
  if (at <= 0 || at === email.length - 1) return null;

  const localPart = email.slice(0, at);
  const domain = email.slice(at + 1);

  // Convert IDN / unicode domains to punycode. domainToASCII returns "" on
  // invalid input, in which case we fall back to a lowercased raw domain so the
  // syntax check can still reject it cleanly.
  const asciiDomain = (domainToASCII(domain) || domain).toLowerCase();

  return {
    localPart,
    domain,
    asciiDomain,
    normalized: `${localPart}@${asciiDomain}`,
  };
}
