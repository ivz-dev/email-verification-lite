import { test } from "node:test";
import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";

// config.ts reads API_KEYS once at import time, and static ESM imports run
// before any module-body code. So set the env first, then dynamically import
// the server so config picks up these keys.
process.env.API_KEYS = "secret-key-aaa,secret-key-bbb";
const { createApp } = await import("../src/server.js");

async function startServer() {
  const app = createApp();
  const server = app.listen(0);
  await new Promise<void>((resolve) => server.once("listening", () => resolve()));
  const { port } = server.address() as AddressInfo;
  return { server, base: `http://127.0.0.1:${port}` };
}

const body = JSON.stringify({ email: "user@example.com", skipDns: true });
const jsonHeaders = { "Content-Type": "application/json" };

test("health is public (no key needed)", async () => {
  const { server, base } = await startServer();
  try {
    const res = await fetch(`${base}/health`);
    assert.equal(res.status, 200);
  } finally {
    server.close();
  }
});

test("rejects request with no API key (401)", async () => {
  const { server, base } = await startServer();
  try {
    const res = await fetch(`${base}/verify`, {
      method: "POST",
      headers: jsonHeaders,
      body,
    });
    assert.equal(res.status, 401);
  } finally {
    server.close();
  }
});

test("rejects request with wrong API key (403)", async () => {
  const { server, base } = await startServer();
  try {
    const res = await fetch(`${base}/verify`, {
      method: "POST",
      headers: { ...jsonHeaders, "X-API-Key": "nope" },
      body,
    });
    assert.equal(res.status, 403);
  } finally {
    server.close();
  }
});

test("accepts valid key via X-API-Key header", async () => {
  const { server, base } = await startServer();
  try {
    const res = await fetch(`${base}/verify`, {
      method: "POST",
      headers: { ...jsonHeaders, "X-API-Key": "secret-key-aaa" },
      body,
    });
    assert.equal(res.status, 200);
  } finally {
    server.close();
  }
});

test("accepts valid key via Authorization: Bearer", async () => {
  const { server, base } = await startServer();
  try {
    const res = await fetch(`${base}/verify`, {
      method: "POST",
      headers: { ...jsonHeaders, Authorization: "Bearer secret-key-bbb" },
      body,
    });
    assert.equal(res.status, 200);
  } finally {
    server.close();
  }
});
