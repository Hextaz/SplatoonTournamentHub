import { Router } from "express";
import { supabase } from "../lib/supabase";
import { RegistrationService } from "../services/RegistrationService";
import { LifecycleService } from "../services/LifecycleService";
import { ArchiveService } from "../services/ArchiveService";
import { SchedulerService } from "../services/SchedulerService";

export const tournamentRouter = Router();

// POST /api/tournaments — Create a new tournament
tournamentRouter.post("/", async (req, res) => {
  try {
    const {
      guild_id, name, description, start_at,
      checkin_start_at, checkin_end_at,
      discord_registration_channel_id, discord_announcement_channel_id,
      discord_checkin_channel_id, discord_captain_role_id, discord_to_role_id,
      guildId,
    } = req.body;

    const effectiveGuildId = guild_id || guildId;
    if (!effectiveGuildId || !name) {
      return res.status(400).json({ error: "guild_id and name are required" });
    }

    // Fetch server default settings
    const { data: serverSettings } = await supabase
      .from("server_settings")
      .select("*")
      .eq("guild_id", effectiveGuildId)
      .single();

    const { data: created, error } = await supabase
      .from("tournaments")
      .insert({
        guild_id: effectiveGuildId,
        name,
        description: description || null,
        status: "REGISTRATION",
        start_at: start_at || null,
        checkin_start_at: checkin_start_at || null,
        checkin_end_at: checkin_end_at || null,
        discord_registration_channel_id: discord_registration_channel_id || serverSettings?.registration_channel_id || null,
        discord_announcement_channel_id: discord_announcement_channel_id || serverSettings?.announcement_channel_id || null,
        discord_checkin_channel_id: discord_checkin_channel_id || serverSettings?.checkin_channel_id || null,
        discord_captain_role_id: discord_captain_role_id || serverSettings?.captain_role_id || null,
        discord_to_role_id: discord_to_role_id || serverSettings?.to_role_id || null,
      })
      .select()
      .single();

    if (error) throw error;

    // Archive old tournaments + init Discord roles/channels
    try {
      const discordClient = req.app.locals.discordClient;

      await supabase.from("tournaments")
        .update({ status: "ARCHIVED" })
        .eq("guild_id", effectiveGuildId)
        .neq("id", created.id)
        .neq("status", "ARCHIVED");

      const { data: settings } = await supabase.from("server_settings")
        .select("captain_role_id")
        .eq("guild_id", effectiveGuildId)
        .single();

      ArchiveService.backgroundDiscordCleanup(discordClient, effectiveGuildId, settings?.captain_role_id).catch((e: any) => console.error(e));

      SchedulerService.scheduleTournament(created);
    } catch (botErr: any) {
      console.warn("[TournamentRouter] Archive/init failed:", botErr?.message || botErr);
    }

    res.status(201).json(created);
  } catch (error: any) {
    console.error("[TournamentRouter] Create error:", error);
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/tournaments/:id/settings — Update tournament settings
tournamentRouter.put("/:id/settings", async (req, res) => {
  try {
    const tournamentId = req.params.id;
    const {
      start_at, checkin_start_at, checkin_end_at,
      discord_registration_channel_id, discord_announcement_channel_id,
      discord_checkin_channel_id, discord_captain_role_id, discord_to_role_id,
    } = req.body;

    const payload: any = {
      start_at: start_at || null,
      checkin_start_at: checkin_start_at || null,
      checkin_end_at: checkin_end_at || null,
      discord_registration_channel_id: discord_registration_channel_id || null,
      discord_announcement_channel_id: discord_announcement_channel_id || null,
      discord_checkin_channel_id: discord_checkin_channel_id || null,
      discord_captain_role_id: discord_captain_role_id || null,
      discord_to_role_id: discord_to_role_id || null,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("tournaments")
      .update(payload)
      .eq("id", tournamentId)
      .select()
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: "Tournament not found" });

    res.json(data);
  } catch (error: any) {
    console.error("[TournamentRouter] Settings update error:", error);
    res.status(500).json({ error: error.message });
  }
});

// PATCH /api/tournaments/:id/visibility — Toggle is_public
tournamentRouter.patch("/:id/visibility", async (req, res) => {
  try {
    const tournamentId = req.params.id;
    const { is_public } = req.body;

    if (typeof is_public !== "boolean") {
      return res.status(400).json({ error: "is_public (boolean) is required" });
    }

    const { data, error } = await supabase
      .from("tournaments")
      .update({ is_public })
      .eq("id", tournamentId)
      .select()
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: "Tournament not found" });

    res.json(data);
  } catch (error: any) {
    console.error("[TournamentRouter] Visibility update error:", error);
    res.status(500).json({ error: error.message });
  }
});

// /api/tournaments/:id/launch
tournamentRouter.post("/:id/launch", async (req, res) => {
  try {
    const tournamentId = req.params.id;
    const { guildId } = req.body;
    const discordClient = req.app.locals.discordClient;

    if (!guildId) return res.status(400).json({ error: "Missing guildId" });

    await LifecycleService.launchTournament(tournamentId, guildId, discordClient);
    res.json({ success: true, message: "Tournament launched successfully." });
  } catch (error: any) {
    console.error(`[TournamentRouter] Error launching tournament:`, error);
    res.status(500).json({ error: error.message });
  }
});

// /api/tournaments/:id/close
tournamentRouter.post("/:id/close", async (req, res) => {
  try {
    const tournamentId = req.params.id;
    const { guildId } = req.body;
    const discordClient = req.app.locals.discordClient;

    if (!guildId) return res.status(400).json({ error: "Missing guildId" });

    await LifecycleService.closeTournament(tournamentId, guildId, discordClient);
    res.json({ success: true, message: "Tournament closed successfully." });
  } catch (error: any) {
    console.error(`[TournamentRouter] Error closing tournament:`, error);
    res.status(500).json({ error: error.message });
  }
});

// /api/tournaments/:id/registrations
tournamentRouter.post("/:id/registrations", async (req, res) => {
  try {
    const tournamentId = req.params.id;
    const { action } = req.body;
    
    const discordClient = req.app.locals.discordClient;
    
    if (action === 'open') {
        const { data: tournament, error: fetchError } = await supabase
          .from('tournaments')
          .select('start_at, start_date, checkin_start_at, status, is_public')
          .eq('id', tournamentId)
          .single();

        if (fetchError || !tournament) {
          return res.status(404).json({ error: "Tournament not found" });
        }
        
        if (!tournament.is_public) {
          return res.status(400).json({ error: "Cannot open registrations: The tournament is currently private. Please make it public first." });
        }

        const now = new Date();
        const startDate = tournament.start_at ? new Date(tournament.start_at) : (tournament.start_date ? new Date(tournament.start_date) : null);
        const checkinStart = tournament.checkin_start_at ? new Date(tournament.checkin_start_at) : null;

        // Condition: During or past check-in, or tournament has started/passed
        if ((checkinStart && now >= checkinStart) || (startDate && now >= startDate) || tournament.status === 'ACTIVE' || tournament.status === 'COMPLETED' || tournament.status === 'ARCHIVED') {
          return res.status(400).json({ error: "Cannot open registrations: The tournament has already reached the check-in phase or has already started." });
        }

        const result = await RegistrationService.sendRegistrationEmbed(tournamentId, discordClient);
        // Si result == vrai, pas d'erreur c'est good

        // Marque les inscriptions comme ouvertes dans la DB
        await supabase
          .from('tournaments')
          .update({ is_registration_open: true })
          .eq('id', tournamentId);
    }
    
    res.json({ success: true, message: "Registration action executed." });
  } catch (error: any) {
    console.error(`[TournamentRouter] Error:`, error);
    res.status(500).json({ error: error.message });
  }
});
