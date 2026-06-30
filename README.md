# email-verification-lite

Email verification REST API on Node.js + TypeScript. Performs **every non-SMTP
check** to assess whether an address is deliverable and trustworthy — without
ever connecting to a mail server.

## Checks performed

| Check | Description |
| --- | --- |
| **Syntax** | RFC 5322 structure of local & domain parts (quoted local parts, label rules, TLD). |
| **Length** | RFC 5321 limits: local ≤ 64, domain ≤ 255, total ≤ 254. |
| **Normalization** | Trims, lowercases the domain, converts IDN/unicode domains to punycode. |
| **DNS / MX** | Resolves MX records; falls back to A/AAAA (RFC 5321 §5); detects NXDOMAIN and null MX (RFC 7505). |
| **Disposable** | Flags known throwaway/temporary providers (mailinator, 10minutemail, …). |
| **Free provider** | Labels free webmail (gmail, yahoo, outlook, …) — informational. |
| **Role account** | Flags non-personal mailboxes (info@, support@, noreply@, …), ignoring `+tags`. |
| **Typo / suggestion** | "Did you mean" using transposition-aware edit distance (e.g. `gmial.com → gmail.com`, `example.con → example.com`). |

SMTP mailbox probing is intentionally **not** implemented.

Each result is scored 0–100 and bucketed into `valid` / `risky` / `invalid`.

## Setup

```bash
npm install
npm run dev      # hot-reload dev server (tsx)
# or
npm run build && npm start
```

Environment variables: `PORT` (3000), `HOST` (0.0.0.0), `DNS_TIMEOUT_MS` (5000),
`MAX_BATCH_SIZE` (100).

## API

### `GET /health`
```json
{ "status": "ok" }
```

### `POST /verify`
Body: `{ "email": "john@gmail.com", "skipDns": false }`

```jsonc
{
  "email": "john.doe@gmail.com",
  "normalizedEmail": "john.doe@gmail.com",
  "status": "valid",
  "score": 100,
  "isValid": true,
  "checks": {
    "syntax":     { "valid": true, "localPart": "john.doe", "domain": "gmail.com" },
    "length":     { "valid": true, "localPartLength": 8, "domainLength": 9, "totalLength": 18 },
    "domain":     { "resolvable": true, "hasMx": true, "mxRecords": ["gmail-smtp-in.l.google.com", "..."], "hasAddressRecord": false, "nullMx": false },
    "disposable": { "isDisposable": false },
    "free":       { "isFreeProvider": true },
    "role":       { "isRoleAccount": false },
    "typo":       { "hasSuggestion": false }
  },
  "reasons": ["Domain has MX records", "Free webmail provider"]
}
```

`skipDns: true` runs all offline checks and skips DNS resolution.

### `POST /verify/batch`
Body: `{ "emails": ["a@x.com", "b@y.com"], "skipDns": false }` (max `MAX_BATCH_SIZE`).
Returns `{ "count": n, "results": [ ... ] }`.

## Scoring

Start at 100. Syntax/length failures and unresolvable or null-MX domains are
disqualifying (`invalid`, score 0). Soft signals subtract: disposable −50, typo
−25, role −15, no-MX-but-A −10, offline −5. `valid` requires ≥ 85 and no
disqualifying or disposable signal; otherwise `risky`.

## Using as a library

```ts
import { verifyEmail } from "./src/verifier/index.js";
const result = await verifyEmail("user@example.com", { skipDns: false });
```

## Tests

```bash
npm test
```

## Project layout

```
src/
  index.ts            server bootstrap
  server.ts           express app + middleware
  config.ts           env config
  types.ts            shared types
  routes/verify.ts    /verify and /verify/batch
  verifier/
    index.ts          verifyEmail() orchestrator
    normalize.ts      parse + IDN/punycode
    syntax.ts         RFC 5322 structure
    length.ts         RFC 5321 length limits
    domain.ts         DNS MX/A + null-MX
    lists.ts          disposable / free / role lookups
    typo.ts           edit-distance suggestions
    score.ts          aggregate scoring & verdict
  data/               curated domain lists
```
