import { Router } from "express";
import { supabase } from "../lib/supabase";

export const serverSettingsRouter = Router();

// PUT /api/server-settings — Upsert server settings
serverSettingsRouter.put("/", async (req, res) => {
  try {
    const { guild_id, captain_role_id, to_role_id, checkin_channel_id, announcement_channel_id, registration_channel_id } = req.body;

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
