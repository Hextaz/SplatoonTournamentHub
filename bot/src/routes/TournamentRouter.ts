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
