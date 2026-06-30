import type { TypoCheck } from "../types.js";
import { COMMON_DOMAINS, COMMON_TLDS } from "../data/common-domains.js";

/** Standard Levenshtein edit distance between two strings. */
export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  let curr = new Array<number>(b.length + 1);

  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(
        curr[j - 1]! + 1, // insertion
        prev[j]! + 1, // deletion
        prev[j - 1]! + cost, // substitution
      );
    }
    [prev, curr] = [curr, prev];
  }
  return prev[b.length]!;
}

/**
 * Optimal String Alignment distance (restricted Damerau-Levenshtein): like
 * Levenshtein but counts a swap of two adjacent characters as a single edit.
 * This catches the most common typing mistake (e.g. "gmial" -> "gmail").
 */
export function osaDistance(a: string, b: string): number {
  if (a === b) return 0;
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  const d: number[][] = Array.from({ length: m + 1 }, () =>
    new Array<number>(n + 1).fill(0),
  );
  for (let i = 0; i <= m; i++) d[i]![0] = i;
  for (let j = 0; j <= n; j++) d[0]![j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i]![j] = Math.min(
        d[i - 1]![j]! + 1, // deletion
        d[i]![j - 1]! + 1, // insertion
        d[i - 1]![j - 1]! + cost, // substitution
      );
      if (
        i > 1 &&
        j > 1 &&
        a[i - 1] === b[j - 2] &&
        a[i - 2] === b[j - 1]
      ) {
        d[i]![j] = Math.min(d[i]![j]!, d[i - 2]![j - 2]! + 1); // transposition
      }
    }
  }
  return d[m]![n]!;
}

/**
 * Detect a likely typo in the domain and suggest a correction.
 *
 * Two strategies:
 *  1. Whole-domain closeness to a popular provider (e.g. "gmial.com").
 *  2. TLD-only closeness when the second-level label already matches a popular
 *     domain (e.g. "gmail.con" -> "gmail.com").
 *
 * Exact matches against the known-good lists are never flagged.
 */
export function checkTypo(localPart: string, asciiDomain: string): TypoCheck {
  if (COMMON_DOMAINS.includes(asciiDomain)) {
    return { hasSuggestion: false };
  }

  // Strategy 1: closest popular domain by edit distance.
  let best: { domain: string; distance: number } | null = null;
  for (const candidate of COMMON_DOMAINS) {
    const distance = osaDistance(asciiDomain, candidate);
    if (best === null || distance < best.distance) {
      best = { domain: candidate, distance };
    }
  }

  // Allow a slightly larger threshold for longer domains, but never so loose
  // that distinct real domains get "corrected".
  const threshold = asciiDomain.length >= 10 ? 2 : 1;
  if (best && best.distance > 0 && best.distance <= threshold) {
    return { hasSuggestion: true, suggestion: `${localPart}@${best.domain}` };
  }

  // Strategy 2: TLD typo on an otherwise-fine domain (e.g. example.con).
  const lastDot = asciiDomain.lastIndexOf(".");
  if (lastDot > 0) {
    const tld = asciiDomain.slice(lastDot + 1);
    if (!COMMON_TLDS.includes(tld)) {
      for (const candidateTld of COMMON_TLDS) {
        if (
          !candidateTld.includes(".") &&
          levenshtein(tld, candidateTld) === 1
        ) {
          const fixedDomain = `${asciiDomain.slice(0, lastDot)}.${candidateTld}`;
          return {
            hasSuggestion: true,
            suggestion: `${localPart}@${fixedDomain}`,
          };
        }
      }
    }
  }

  return { hasSuggestion: false };
}
