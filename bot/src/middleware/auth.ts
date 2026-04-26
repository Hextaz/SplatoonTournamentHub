import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const BOT_API_SECRET = process.env.BOT_API_SECRET || "";

/**
 * Middleware that authenticates requests to the bot API.
 *
 * Two supported methods:
 * 1. Shared secret: `Authorization: Bearer <BOT_API_SECRET>`
 *    - Simple and effective for service-to-service calls (web → bot)
 * 2. Supabase JWT: `Authorization: Bearer <supabase_jwt>`
 *    - Validates the JWT signed with SUPABASE_JWT_SECRET and extracts discord_id
 *    - Sets req.user = { discord_id } for downstream use
 */
export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  // Skip auth for health check
  if (req.path === "/health") return next();

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing Authorization header" });
  }

  const token = authHeader.slice(7);

  // Method 1: Shared secret match
  if (BOT_API_SECRET && token === BOT_API_SECRET) {
    return next();
  }

  // Method 2: Supabase JWT validation
  const supabaseSecret = process.env.SUPABASE_JWT_SECRET;
  if (!supabaseSecret) {
    return res.status(500).json({ error: "Server auth misconfiguration" });
  }

  try {
    const decoded = jwt.verify(token, supabaseSecret) as { discord_id?: string; role?: string };
    if (!decoded.discord_id) {
      return res.status(401).json({ error: "Invalid token: missing discord_id" });
    }
    (req as any).user = { discord_id: decoded.discord_id };
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}
