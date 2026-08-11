import { Router } from "express";
import { supabase } from "../lib/supabase";
import { getAuthenticatedGuildId } from "../utils/tenant";

export const serverSettingsRouter = Router();

// PUT /api/server-settings — Upsert server settings
serverSettingsRouter.put("/", async (req, res) => {
  try {
    const { guild_id, captain_role_id, to_role_id, checkin_channel_id, announcement_channel_id, registration_channel_id, language } = req.body;
    const authGuildId = getAuthenticatedGuildId(req);

    if (!authGuildId || guild_id !== authGuildId) {
      return res.status(403).json({ error: "Accès refusé : vous ne pouvez modifier que les paramètres de votre propre serveur." });
    }

    if (!guild_id) {
      return res.status(400).json({ error: "guild_id is required" });
    }

    const payload: any = {
      guild_id,
      captain_role_id: captain_role_id || null,
      to_role_id: to_role_id || null,
      checkin_channel_id: checkin_channel_id || null,
      announcement_channel_id: announcement_channel_id || null,
      registration_channel_id: registration_channel_id || null,
      language: language && (language === 'en' || language === 'fr') ? language : 'fr',
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("server_settings")
      .upsert(payload, { onConflict: "guild_id" })
      .select()
      .single();

    if (error) throw error;

    res.json(data);
  } catch (error: any) {
    console.error("[ServerSettingsRouter] Upsert error:", error);
    res.status(500).json({ error: error.message });
  }
});
