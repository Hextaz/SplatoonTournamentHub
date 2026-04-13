import { Router } from "express";
import { supabase } from "../lib/supabase";
import { RegistrationService } from "../services/RegistrationService";

export const tournamentRouter = Router();

// /api/tournaments/:id/registrations
tournamentRouter.post("/:id/registrations", async (req, res) => {
  try {
    const tournamentId = req.params.id;
    const { action } = req.body;
    
    const discordClient = req.app.locals.discordClient;
    
    if (action === 'open') {
        const result = await RegistrationService.sendRegistrationEmbed(tournamentId, discordClient);
        if(!result) return res.status(400).json({ error: "Failed to send embed" });
    }
    
    res.json({ success: true, message: "Registration action executed." });
  } catch (error: any) {
    console.error(`[TournamentRouter] Error:`, error);
    res.status(500).json({ error: error.message });
  }
});
