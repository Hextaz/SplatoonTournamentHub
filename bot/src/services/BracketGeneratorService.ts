import { supabase } from "../lib/supabase";
import crypto from "crypto";

interface MatchData {
  id: string;
  phase_id: string;
  round_number: number;
  match_number: number;
  team1_id: string | null;
  team2_id: string | null;
  next_match_winner_id: string | null;
  status: string;
  team1_score?: number;
  team2_score?: number;
}

export class BracketGeneratorService {
  /**
   * Retourne un tableau d'index de seeds "pliés" mathématiquement pour la taille donnée.
   * Ex. Taille 8 : [1, 8, 4, 5, 2, 7, 3, 6]
   */
  private static getStandardSeeds(bracketSize: number): number[] {
    let seeds = [1, 2];
    for (let currentSize = 4; currentSize <= bracketSize; currentSize *= 2) {
      const nextSeeds = [];
      for (const seed of seeds) {
        nextSeeds.push(seed);
        nextSeeds.push(currentSize + 1 - seed);
      }
      seeds = nextSeeds;
    }
    return seeds;
  }

  /**
   * Génère la structure entière de l'arbre et résout les BYEs automatiques.
   */
  static async generateBracket(phaseId: string, bracketSize: number) {
    // 1. Récupération des seeds actuels
    const { data: seededRows, error: seedError } = await supabase
      .from("phase_teams")
      .select("team_id, seed")
      .eq("phase_id", phaseId);

    if (seedError) throw seedError;
    const seededTeams = seededRows || [];

    // 2. Génération des IDs et des Matches
    const rounds: MatchData[][] = [];
    const totalRounds = Math.log2(bracketSize);

    if (!Number.isInteger(totalRounds)) {
      throw new Error("La taille de l'arbre doit être une puissance de 2 (4, 8, 16, 32...).");
    }

    let matchGlobalCount = 1;

    // Construction purement structurelle des rounds (de R1 à la Finale)
    for (let r = 1; r <= totalRounds; r++) {
      const numMatchesInRound = bracketSize / Math.pow(2, r);
      const roundMatches: MatchData[] = [];
      
      for (let m = 1; m <= numMatchesInRound; m++) {
        roundMatches.push({
          id: crypto.randomUUID(),
          phase_id: phaseId,
          round_number: r,
          match_number: matchGlobalCount++,
          team1_id: null,
          team2_id: null,
          next_match_winner_id: null,
          status: "PENDING"
        });
      }
      rounds.push(roundMatches);
    }

    // 3. Liaison structurelle (Pointeurs vers le Round suivant)
    for (let r = 0; r < rounds.length - 1; r++) {
      const currentRound = rounds[r]!
      const nextRound = rounds[r + 1]!
      
      for (let i = 0; i < currentRound.length; i++) {
        const parentMatchIndex = Math.floor(i / 2);
        currentRound[i]!.next_match_winner_id = nextRound[parentMatchIndex]!.id;
      }
    }

    // 4. Injection des Seeds au Round 1
    const foldedSeeds = this.getStandardSeeds(bracketSize);
    const round1Matches = rounds[0]!

    for (let i = 0; i < round1Matches.length; i++) {
      const seed1 = foldedSeeds[i * 2];
      const seed2 = foldedSeeds[i * 2 + 1];
      
      const team1 = seededTeams.find(t => t.seed === seed1)?.team_id || null;
      const team2 = seededTeams.find(t => t.seed === seed2)?.team_id || null;
      
      round1Matches[i]!.team1_id = team1;
      round1Matches[i]!.team2_id = team2;
    }

    // 5. Moteur d'Auto-Résolution des BYEs en mémoire
    // On analyse le Round 1. S'il manque un adversaire, l'équipe présente est propulsée.
    for (let r = 0; r < rounds.length; r++) {
      const currentRound = rounds[r]!

      for (let i = 0; i < currentRound.length; i++) {
        const match = currentRound[i]!;
        
        // Logique de résolution exclusive aux tours dépendants de slots statiques (Généralement Round 1)
        if (match.round_number === 1) {
          const isTeam1Empty = !match.team1_id;
          const isTeam2Empty = !match.team2_id;

          if (isTeam1Empty && isTeam2Empty) {
            // Double Slot Vide : Pas d'équipe à propulser, le match meurt ici (COMPLETED technique)
            match.status = "COMPLETED";
            // Le parent recevra un NULL naturellement puisqu'on ne propulse personne
          } 
          else if (isTeam1Empty || isTeam2Empty) {
            // 🏆 C'est un BYE ! Une équipe gagne par forfait.
            match.status = "COMPLETED";
            match.team1_score = isTeam1Empty ? 0 : 1;
            match.team2_score = isTeam2Empty ? 0 : 1;

            const winnerId = isTeam1Empty ? match.team2_id : match.team1_id;

            // Propulsion dans le Round 2 (parent)
            if (rounds[r + 1]) {
              const parentMatchIndex = Math.floor(i / 2);
              const parentMatch = rounds[r + 1]![parentMatchIndex]!
              
              // Si le match actuel est un enfant pair (0, 2, 4...), il va dans le team1_id
              if (i % 2 === 0) {
                parentMatch.team1_id = winnerId;
              } else {
                parentMatch.team2_id = winnerId;
              }
            }
          }
        }
      }
    }

    // 6. Insertion optimisée de TOUS les matchs résolus et liés en une seule requête Supabase
    const flattenMatches = rounds.flat();
    const { error: insertError } = await supabase
      .from("matches")
      .insert(flattenMatches);

    if (insertError) {
      console.error("Erreur Bulk Insert Matches: ", insertError);
      throw new Error("L'insertion de l'arbre a échoué.");
    }

    return flattenMatches;
  }
}
