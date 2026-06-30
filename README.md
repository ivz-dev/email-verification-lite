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
`MAX_BATCH_SIZE` (100), `API_KEYS` (comma-separated, see below).

## Authentication

All endpoints except `GET /health` require an API key. Configure accepted keys
via the `API_KEYS` env var (comma-separated):

```dotenv
API_KEYS=key-one,key-two
```

Generate a strong key:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Clients send the key in either form:

```bash
curl -H 'X-API-Key: key-one' ...
curl -H 'Authorization: Bearer key-one' ...
```

Responses: `401` when no key is presented, `403` when the key is invalid. Keys
are compared in constant time. If `API_KEYS` is empty, auth is **disabled** (a
startup warning is logged) — intended for local development only.

## Production (PM2)

The repo ships an `ecosystem.config.cjs` that runs the compiled app in cluster
mode across all CPU cores, with auto-restart and a memory ceiling. It holds **no
environment values** — the app loads its own `.env` at startup (see
`src/env.ts`), so all config/secrets live in exactly one place.

```bash
# one-time: install PM2 globally
npm install -g pm2

# build + (re)start under PM2 — also use this to deploy new versions
npm run build
npm run pm2:start        # first launch
npm run pm2:reload       # zero-downtime reload after a rebuild

# or do build + ci + start/reload in one shot
npm run deploy

# survive reboots
pm2 save
pm2 startup              # follow the printed instructions

# operations
npm run pm2:logs         # tail logs
pm2 status               # process list
npm run pm2:stop         # stop
```

Make sure a production `.env` exists (at least `API_KEYS`) next to the app
before starting; see `.env.example`.

## API

### `GET /health`  *(public, no key)*
```json
{ "status": "ok" }
```

### `POST /verify`  *(requires API key)*
Body: `{ "email": "john@gmail.com", "skipDns": false }`

```bash
curl -X POST http://localhost:3000/verify \
  -H 'Content-Type: application/json' \
  -H 'X-API-Key: key-one' \
  -d '{"email": "john.doe@gmail.com"}'
```

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
