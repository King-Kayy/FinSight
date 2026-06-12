/**
 * server/middleware/auth.ts
 *
 * JWT verification middleware for protected Express routes.
 *
 * Usage:
 *   import { authenticateJWT } from "./middleware/auth";
 *   app.get("/api/protected", authenticateJWT, handler);
 *
 * On success:  attaches `req.user = { id: number, email: string }` and calls next().
 * On failure:  responds 401 { error: "Unauthorized" } for any reason
 *              (missing header, expired token, bad signature, tampered claims).
 */

import { RequestHandler } from "express";
import jwt from "jsonwebtoken";

// ---------------------------------------------------------------------------
// Express Request augmentation
// ---------------------------------------------------------------------------

declare global {
  namespace Express {
    interface Request {
      user?: { id: number; email: string };
    }
  }
}

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------

interface JwtPayload {
  id: number;
  email: string;
}

export const authenticateJWT: RequestHandler = (req, res, next): void => {
  const authHeader = req.headers["authorization"];

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const token = authHeader.slice(7); // Remove "Bearer " prefix
  const secret = process.env.JWT_SECRET ?? "dev-secret";

  try {
    const payload = jwt.verify(token, secret) as JwtPayload;

    // Validate that the required claims are present and have the right types
    if (typeof payload.id !== "number" || typeof payload.email !== "string") {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    req.user = { id: payload.id, email: payload.email };
    next();
  } catch {
    // Covers: JsonWebTokenError, TokenExpiredError, NotBeforeError
    res.status(401).json({ error: "Unauthorized" });
  }
};
