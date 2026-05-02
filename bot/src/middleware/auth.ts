import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { PermissionFlagsBits } from "discord.js";
import { supabase } from "../lib/supabase";

const BOT_API_SECRET = process.env.BOT_API_SECRET || "";

/**
 * Middleware that authenticates requests to the bot API.
 *
 * Two supported methods:
 * 1. Shared secret: `Authorization: Bearer <BOT_API_SECRET>`
 *   - Simple and effective for service-to-service calls (web → bot)
 * 2. Supabase JWT: `Authorization: Bearer <supabase_jwt>`
 *   - Validates the JWT signed with SUPABASE_JWT_SECRET and extracts discord_id
 *   - Sets req.user = { discord_id } for downstream use
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

/**
 * Middleware that requires the requesting user to be a guild admin.
 * Checks Discord permissions live from the bot's cached member data.
 *
 * Identity resolution order:
 * 1. req.user.discord_id (set by JWT auth)
 * 2. X-Discord-User-Id header (set by Next.js proxy when using BOT_API_SECRET)
 *
 * Guild ID resolution order:
 * 1. req.body.guildId
 * 2. req.query.guildId
 * 3. X-Guild-Id header (set by Next.js proxy)
 *
 * Authorizes if the user has ANY of:
 * - Server Owner
 * - Administrator permission
 * - ManageGuild permission
 * - The configured TO role for the server
 */
export function requireGuildAdmin(discordClient: any) {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Resolve discord user ID
    const discordId =
      (req as any).user?.discord_id ||
      req.headers["x-discord-user-id"] as string;

    // Resolve guild ID
    const guildId =
      req.body?.guildId ||
      req.query?.guildId as string ||
      req.headers["x-guild-id"] as string;

    if (!discordId) {
      return res.status(401).json({ error: "User identity required — provide JWT or X-Discord-User-Id header" });
    }
    if (!guildId) {
      return res.status(400).json({ error: "guildId required — provide in body, query, or X-Guild-Id header" });
    }

    try {
      const guild = await discordClient.guilds.fetch(guildId).catch(() => null);
      if (!guild) {
        return res.status(404).json({ error: "Guild not found" });
      }

      const member = await guild.members.fetch(discordId).catch(() => null);
      if (!member) {
        return res.status(403).json({ error: "User not found in guild" });
      }

      // Check: Server Owner
      const isOwner = guild.ownerId === discordId;

      // Check: Administrator or ManageGuild
      const hasAdminPerm =
        member.permissions.has(PermissionFlagsBits.Administrator) ||
        member.permissions.has(PermissionFlagsBits.ManageGuild);

      // Check: TO role from DB
      let hasToRole = false;
      const { data: serverSettings } = await supabase
        .from("server_settings")
        .select("to_role_id")
        .eq("guild_id", guildId)
        .single();

      if (serverSettings?.to_role_id) {
        hasToRole = member.roles.cache.has(serverSettings.to_role_id);
      }

      if (!isOwner && !hasAdminPerm && !hasToRole) {
        return res.status(403).json({ error: "Insufficient Discord permissions" });
      }

      // Attach admin info for downstream use
      (req as any).adminCheck = {
        discordId,
        guildId,
        isOwner,
        hasAdminPerm,
        hasToRole,
      };

      next();
    } catch (err) {
      return res.status(500).json({ error: "Permission check failed" });
    }
  };
}
