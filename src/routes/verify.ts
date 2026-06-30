import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { verifyEmail } from "../verifier/index.js";
import { config } from "../config.js";

const singleSchema = z.object({
  email: z.string().min(1, "email is required").max(320),
  skipDns: z.boolean().optional(),
});

// Query params arrive as strings, so skipDns is coerced from "true"/"false".
const querySchema = z.object({
  email: z.string().min(1, "email is required").max(320),
  skipDns: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => v === "true"),
});

const batchSchema = z.object({
  emails: z
    .array(z.string().min(1).max(320))
    .min(1, "emails must not be empty")
    .max(config.maxBatchSize, `at most ${config.maxBatchSize} emails per request`),
  skipDns: z.boolean().optional(),
});

export const verifyRouter = Router();

/** GET /verify?email=...&skipDns=true — verify a single address via query params. */
verifyRouter.get("/verify", async (req: Request, res: Response) => {
  const parsed = querySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid request", details: parsed.error.flatten() });
  }

  const result = await verifyEmail(parsed.data.email, {
    skipDns: parsed.data.skipDns,
    dnsTimeoutMs: config.dnsTimeoutMs,
  });
  return res.json(result);
});

/** POST /verify — verify a single address. */
verifyRouter.post("/verify", async (req: Request, res: Response) => {
  const parsed = singleSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid request", details: parsed.error.flatten() });
  }

  const result = await verifyEmail(parsed.data.email, {
    skipDns: parsed.data.skipDns,
    dnsTimeoutMs: config.dnsTimeoutMs,
  });
  return res.json(result);
});

/** POST /verify/batch — verify many addresses concurrently. */
verifyRouter.post("/verify/batch", async (req: Request, res: Response) => {
  const parsed = batchSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid request", details: parsed.error.flatten() });
  }

  const { emails, skipDns } = parsed.data;
  const results = await Promise.all(
    emails.map((email) =>
      verifyEmail(email, { skipDns, dnsTimeoutMs: config.dnsTimeoutMs }),
    ),
  );

  return res.json({ count: results.length, results });
});
