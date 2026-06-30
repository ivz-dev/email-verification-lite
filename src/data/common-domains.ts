/**
 * Popular domains used as targets for typo / "did you mean" suggestions.
 * A misspelled domain that is within a small edit distance of one of these is
 * flagged with a suggested correction.
 */
export const COMMON_DOMAINS: readonly string[] = [
  "gmail.com",
  "googlemail.com",
  "yahoo.com",
  "yahoo.co.uk",
  "hotmail.com",
  "hotmail.co.uk",
  "outlook.com",
  "live.com",
  "msn.com",
  "icloud.com",
  "me.com",
  "aol.com",
  "gmx.com",
  "gmx.net",
  "mail.com",
  "mail.ru",
  "yandex.ru",
  "zoho.com",
  "protonmail.com",
  "proton.me",
  "fastmail.com",
  "ukr.net",
  "i.ua",
  "meta.ua",
];

/** Common TLDs used to detect TLD typos like ".con" -> ".com". */
export const COMMON_TLDS: readonly string[] = [
  "com",
  "net",
  "org",
  "edu",
  "gov",
  "co.uk",
  "io",
  "co",
  "ua",
  "ru",
  "de",
  "fr",
  "info",
];
