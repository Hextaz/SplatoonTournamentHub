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

// Appliquer le seeding
phaseRouter.put("/:id/seeding", async (req, res) => {
  try {
    const phaseId = req.params.id;
    const { participants } = req.body; // array of { team_id, seed }

    // On supprime d'abord les seeds existantes
    const { error: delError } = await supabase
      .from("phase_teams")
      .delete()
      .eq("phase_id", phaseId);

    if (delError) throw delError;

    if (participants && participants.length > 0) {
      const inserts = participants.map((p: any) => ({
        phase_id: phaseId,
        team_id: p.team_id,
        seed: p.seed
      }));

      const { error } = await supabase
        .from("phase_teams")
        .insert(inserts);

      if (error) throw error;
    }

    res.status(200).json({ message: "Seeding sauvegardé" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Récupérer le seeding actuel
phaseRouter.get("/:id/seeding", async (req, res) => {
  try {
    const phaseId = req.params.id;
    
    const { data: seeded, error: err1 } = await supabase
      .from("phase_teams")
      .select("team_id, seed, teams(id, name, logo_url)")
      .eq("phase_id", phaseId)
      .order("seed", { ascending: true });

    if (err1) throw err1;
    res.status(200).json(seeded || []);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Publier une phase
phaseRouter.post("/:id/publish", async (req, res) => {
  try {
    const phaseId = req.params.id;

    // 1. Récupérer la taille demandée pour cette phase
    const { data: phaseData, error: phaseErr } = await supabase
      .from("phases")
      .select("bracket_size")
      .eq("id", phaseId)
      .single();
    
    if (phaseErr) throw phaseErr;

    // 2. Lancer la génération mathématique via le Service externe et propulser les BYEs
    await BracketGeneratorService.generateBracket(phaseId, phaseData.bracket_size || 8);

    // 3. Passer la phase en mode PUBLISHED (Bloque le seed et valide l'arbre)
    const { error } = await supabase
      .from("phases")
      .update({ status: "PUBLISHED" })
      .eq("id", phaseId);

    if (error) throw error;

    res.status(200).json({ message: "Phase générée et publiée avec succès" });
  } catch (error: any) {
    console.error("Publish Error:", error);
    res.status(500).json({ error: error.message });
  }
});
