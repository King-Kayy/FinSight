import "dotenv/config";
import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import cron from "node-cron";
import { handleDemo } from "./routes/demo";
import authRouter from "./routes/auth";
import incomeRouter from "./routes/income";
import expensesRouter from "./routes/expenses";
import reportsRouter from "./routes/reports";
import budgetsRouter from "./routes/budgets";
import savingsGoalsRouter from "./routes/savingsGoals";
import recurringRouter from "./routes/recurringExpenses";
import ocrRouter from "./routes/ocr";
import exportRouter from "./routes/export";
import { initializeDb } from "./db/index";
import { processScheduled } from "./services/recurringService";
import {
  ValidationError,
  AuthError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
} from "./middleware/errors";

export async function createServer() {
  // Initialise the database (PostgreSQL or in-memory fallback)
  await initializeDb();

  // Schedule recurring expense processing every 5 minutes
  cron.schedule("*/5 * * * *", () => {
    processScheduled().catch((err) =>
      console.error("[Cron] processScheduled failed:", err)
    );
  });

  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Health check
  app.get("/api/ping", (_req, res) => {
    const ping = process.env.PING_MESSAGE ?? "ping";
    res.json({ message: ping });
  });

  // Debug endpoint — shows DB connection state (remove before production)
  app.get("/api/debug/status", (_req, res) => {
    res.json({
      db: process.env.DATABASE_URL ? "postgresql (configured)" : "in-memory fallback",
      host: process.env.DATABASE_URL
        ? new URL(process.env.DATABASE_URL).hostname
        : "none",
      jwt_secret_set: !!process.env.JWT_SECRET,
    });
  });

  app.get("/api/demo", handleDemo);

  // Auth routes (public)
  app.use("/api", authRouter);

  // Protected API routes
  app.use("/api", incomeRouter);
  app.use("/api", expensesRouter);
  app.use("/api", budgetsRouter);
  app.use("/api", reportsRouter);
  app.use("/api", savingsGoalsRouter);
  app.use("/api", recurringRouter);
  app.use("/api", ocrRouter);
  app.use("/api", exportRouter);

  // ---------------------------------------------------------------------------
  // Global error handler — must be registered AFTER all routes
  // ---------------------------------------------------------------------------
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof ValidationError) {
      return res
        .status(422)
        .json({ error: err.message, field: (err as ValidationError).field });
    }
    if (err instanceof AuthError) return res.status(401).json({ error: err.message });
    if (err instanceof ForbiddenError) return res.status(403).json({ error: err.message });
    if (err instanceof NotFoundError) return res.status(404).json({ error: err.message });
    if (err instanceof ConflictError) return res.status(409).json({ error: err.message });
    // Log full error details server-side and return the actual message to the client
    // so registration/login failures are visible during development
    console.error("[Server Error]", err);
    return res.status(500).json({ error: err.message ?? "Internal server error" });
  });

  return app;
}
