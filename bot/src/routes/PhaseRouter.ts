import { Router } from "express";
import { supabase } from "../lib/supabase";
import { BracketGeneratorService } from "../services/BracketGeneratorService";

export const phaseRouter = Router();

// Créer une phase (DRAFT)
phaseRouter.post("/", async (req, res) => {
  try {
    const { tournament_id, name, format, phase_order, bracket_size } = req.body;
    const { data: newPhase, error } = await supabase
      .from("phases")
      .insert({
        tournament_id,
        name,
        format: format || "SINGLE_ELIM",
        bracket_size: bracket_size || 8,
        phase_order: phase_order || 1,
        status: "DRAFT",
      })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(newPhase);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Obtenir les phases d'un tournoi
phaseRouter.get("/:tournamentId", async (req, res) => {
  try {
    const { data: phases, error } = await supabase
      .from("phases")
      .select("*")
      .eq("tournament_id", req.params.tournamentId)
      .order("phase_order", { ascending: true });

    if (error) throw error;
    res.json(phases || []);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Appliquer le seeding et régénérer l'arbre (Live Edit)
phaseRouter.put("/:id/seeding", async (req, res) => {
  try {
    const phaseId = req.params.id;
    const { participants } = req.body;

    // 0. Sécurité : Vérifier si des matchs ont déjà commencé
    const { data: activeMatches, error: matchCheckErr} = await supabase
      .from('matches')
      .select('id, status, team1_score, team2_score, team1_id, team2_id')
      .eq('phase_id', phaseId);
      
    if (matchCheckErr) throw matchCheckErr;
    if (activeMatches && activeMatches.length > 0) {
      // Ignorer les matchs fictifs (BYE, TBD)
      const hasStarted = activeMatches.some(m => {
        // C'est un vrai match s'il y a deux équipes concernées
        const isRealMatch = m.team1_id !== null && m.team2_id !== null;
        if (!isRealMatch) return false;
        
        return m.status === 'COMPLETED' || m.team1_score > 0 || m.team2_score > 0;
      });
      if (hasStarted) return res.status(400).json({ error: 'Impossible de modifier le placement : des matchs ont déjà des scores ou sont terminés.' });
    }

    const { error: delError } = await supabase.from('phase_teams').delete().eq('phase_id', phaseId);
    if (delError) throw delError;

    if (participants && participants.length > 0) {
      const inserts = participants.map((p: any) => ({ phase_id: phaseId, team_id: p.team_id, seed: p.seed }));
      const { error } = await supabase.from('phase_teams').insert(inserts);
      if (error) throw error;
    }

    const { error: delMatchesError } = await supabase.from('matches').delete().eq('phase_id', phaseId);
    if (delMatchesError) throw delMatchesError;

    const { data: phaseData, error: phaseErr } = await supabase.from('phases').select('bracket_size').eq('id', phaseId).single();
    if (phaseErr) throw phaseErr;

    await BracketGeneratorService.generateBracket(phaseId, phaseData.bracket_size || 8);

    res.status(200).json({ message: 'Placement et arbre mis à jour avec succès' });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// Récupérer le seeding actuel
phaseRouter.get("/:id/seeding", async (req, res) => {
  try {
    const phaseId = req.params.id;
    const { data: seeded, error: err1 } = await supabase.from('phase_teams').select('team_id, seed, teams(id, name, logo_url)').eq('phase_id', phaseId).order('seed', { ascending: true });
    if (err1) throw err1;
    res.status(200).json(seeded || []);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});
