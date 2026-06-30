import express, {
  type Express,
  type NextFunction,
  type Request,
  type Response,
} from "express";
import { verifyRouter } from "./routes/verify.js";
import { apiKeyAuth } from "./middleware/auth.js";
import { config } from "./config.js";

export function createApp(): Express {
  const app = express();

  // Parse JSON bodies. `type: () => true` parses the body as JSON regardless of
  // the Content-Type header, so requests from API gateways that omit
  // "Content-Type: application/json" (e.g. Zyla) are still understood. Bodies
  // that are not valid JSON fall through to the error handler as a 400.
  app.use(express.json({ limit: "256kb", type: () => true }));

  // Public: liveness probe, no auth required.
  app.get("/health", (_req: Request, res: Response) => {
    res.json({ status: "ok" });
  });

  // Everything below requires a valid API key (unless none are configured).
  app.use(apiKeyAuth(config.apiKeys));
  app.use(verifyRouter);

  // 404 handler.
  app.use((_req: Request, res: Response) => {
    res.status(404).json({ error: "Not found" });
  });

  // Centralized error handler (e.g. malformed JSON body).
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    const message =
      err instanceof Error ? err.message : "Internal server error";
    const status =
      err instanceof SyntaxError && "status" in err ? 400 : 500;
    res.status(status).json({ error: message });
  });

  return app;
}
