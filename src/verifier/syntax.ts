import type { SyntaxCheck } from "../types.js";
import type { ParsedEmail } from "./normalize.js";

// Unquoted local part: dot-separated atoms of allowed atext characters.
// Allowed chars per RFC 5322 atext: A-Za-z0-9 and !#$%&'*+/=?^_`{|}~-
const ATEXT = "[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]";
const UNQUOTED_LOCAL = new RegExp(`^${ATEXT}+(?:\\.${ATEXT}+)*$`);

// Quoted local part: "..." allowing most printable chars and escaped sequences.
const QUOTED_LOCAL = /^"(?:[^"\\\r\n]|\\.)*"$/;

// Domain label: starts/ends alphanumeric, may contain hyphens, 1-63 chars.
const LABEL = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?$/;

function isValidLocalPart(local: string): boolean {
  if (local.length === 0) return false;
  if (local.startsWith('"') && local.endsWith('"')) {
    return QUOTED_LOCAL.test(local);
  }
  // Unquoted parts cannot start or end with a dot, nor contain "..".
  if (local.startsWith(".") || local.endsWith(".") || local.includes("..")) {
    return false;
  }
  return UNQUOTED_LOCAL.test(local);
}

function isValidDomain(asciiDomain: string): boolean {
  // Reject IP-literal-looking or malformed domains; require at least two labels
  // (a TLD) for a deliverable public address.
  if (asciiDomain.length === 0) return false;
  if (asciiDomain.startsWith(".") || asciiDomain.endsWith(".")) return false;
  if (asciiDomain.includes("..")) return false;

  const labels = asciiDomain.split(".");
  if (labels.length < 2) return false;
  if (!labels.every((label) => LABEL.test(label))) return false;

  // The TLD must be non-numeric and at least two characters.
  const tld = labels[labels.length - 1]!;
  if (tld.length < 2 || /^\d+$/.test(tld)) return false;

  return true;
}

/**
 * Validate the structural syntax of a parsed email. Operates on the ASCII form
 * of the domain so internationalized domains are checked after punycode
 * conversion.
 */
export function checkSyntax(parsed: ParsedEmail | null): SyntaxCheck {
  if (!parsed) {
    return { valid: false, reason: "Missing or misplaced '@' separator" };
  }

  const { localPart, asciiDomain } = parsed;

  if (!isValidLocalPart(localPart)) {
    return {
      valid: false,
      reason: "Invalid local part (text before '@')",
      localPart,
      domain: asciiDomain,
    };
  }

  if (!isValidDomain(asciiDomain)) {
    return {
      valid: false,
      reason: "Invalid domain (text after '@')",
      localPart,
      domain: asciiDomain,
    };
  }

  return { valid: true, localPart, domain: asciiDomain };
}
