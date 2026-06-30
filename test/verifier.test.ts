import { test } from "node:test";
import assert from "node:assert/strict";
import { verifyEmail } from "../src/verifier/index.js";
import { checkSyntax } from "../src/verifier/syntax.js";
import { parseEmail } from "../src/verifier/normalize.js";
import { checkTypo, levenshtein } from "../src/verifier/typo.js";
import { checkLength } from "../src/verifier/length.js";

// All tests run with skipDns so they are deterministic and offline.
const opts = { skipDns: true };

test("accepts a well-formed address", async () => {
  const r = await verifyEmail("john.doe@gmail.com", opts);
  assert.equal(r.checks.syntax.valid, true);
  assert.equal(r.checks.free.isFreeProvider, true);
  assert.equal(r.normalizedEmail, "john.doe@gmail.com");
});

test("rejects address without @", async () => {
  const r = await verifyEmail("not-an-email", opts);
  assert.equal(r.status, "invalid");
  assert.equal(r.checks.syntax.valid, false);
});

test("rejects double dots in local part", () => {
  const s = checkSyntax(parseEmail("a..b@example.com"));
  assert.equal(s.valid, false);
});

test("rejects leading dot in local part", () => {
  const s = checkSyntax(parseEmail(".bob@example.com"));
  assert.equal(s.valid, false);
});

test("rejects single-label domain", () => {
  const s = checkSyntax(parseEmail("bob@localhost"));
  assert.equal(s.valid, false);
});

test("normalizes IDN domain to punycode", () => {
  const parsed = parseEmail("user@пошта.укр");
  assert.ok(parsed);
  assert.ok(parsed!.asciiDomain.startsWith("xn--"));
});

test("detects disposable domain", async () => {
  const r = await verifyEmail("test@mailinator.com", opts);
  assert.equal(r.checks.disposable.isDisposable, true);
  assert.equal(r.status, "risky");
});

test("detects role account ignoring +tag", async () => {
  const r = await verifyEmail("info+sales@example.com", opts);
  assert.equal(r.checks.role.isRoleAccount, true);
});

test("suggests fix for misspelled gmail", async () => {
  const r = await verifyEmail("user@gmial.com", opts);
  assert.equal(r.checks.typo.hasSuggestion, true);
  assert.equal(r.checks.typo.suggestion, "user@gmail.com");
});

test("suggests fix for TLD typo", () => {
  const t = checkTypo("user", "example.con");
  assert.equal(t.hasSuggestion, true);
  assert.equal(t.suggestion, "user@example.com");
});

test("does not flag a correct common domain", () => {
  const t = checkTypo("user", "gmail.com");
  assert.equal(t.hasSuggestion, false);
});

test("enforces local part length limit", () => {
  const longLocal = "a".repeat(65);
  const l = checkLength(parseEmail(`${longLocal}@example.com`));
  assert.equal(l.valid, false);
});

test("levenshtein basic distances", () => {
  assert.equal(levenshtein("gmail", "gmial"), 2);
  assert.equal(levenshtein("com", "con"), 1);
  assert.equal(levenshtein("abc", "abc"), 0);
});
