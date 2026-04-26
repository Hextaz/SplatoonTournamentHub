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

  static async generateBracket(phaseId: string, bracketSize: number) {
    const { data: seededRows, error: seedError } = await supabase
      .from("phase_teams")
      .select("team_id, seed")
      .eq("phase_id", phaseId);

    if (seedError) throw seedError;
    const seededTeams = seededRows || [];

    // Check for duplicate seeds
    const seedSet = new Set<number>();
    for (const row of seededTeams) {
      if (row.seed !== null && row.seed !== undefined) {
        if (seedSet.has(row.seed)) {
          throw new Error(`Duplicate seed ${row.seed} found in phase ${phaseId}. Each team must have a unique seed.`);
        }
        seedSet.add(row.seed);
      }
    }

    const rounds: MatchData[][] = [];
    const totalRounds = Math.log2(bracketSize);

    if (!Number.isInteger(totalRounds)) {
      throw new Error("La taille de l'arbre doit être une puissance de 2 (4, 8, 16, 32...).");
    }

    let matchGlobalCount = 1;

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

    // Link matches: each match points to its parent (next round)
    for (let r = 0; r < rounds.length - 1; r++) {
      const currentRound = rounds[r]!;
      const nextRound = rounds[r + 1]!;

      for (let i = 0; i < currentRound.length; i++) {
        const parentMatchIndex = Math.floor(i / 2);
        currentRound[i]!.next_match_winner_id = nextRound[parentMatchIndex]!.id;
      }
    }

    // Inject seeds into Round 1
    const foldedSeeds = this.getStandardSeeds(bracketSize);
    const round1Matches = rounds[0]!;

    for (let i = 0; i < round1Matches.length; i++) {
      const seed1 = foldedSeeds[i * 2];
      const seed2 = foldedSeeds[i * 2 + 1];

      const team1 = seededTeams.find(t => t.seed === seed1)?.team_id || null;
      const team2 = seededTeams.find(t => t.seed === seed2)?.team_id || null;

      round1Matches[i]!.team1_id = team1;
      round1Matches[i]!.team2_id = team2;
    }

    // Auto-resolve BYEs across ALL rounds (cascade propagation)
    let changed = true;
    while (changed) {
      changed = false;
      for (let r = 0; r < rounds.length; r++) {
        const currentRound = rounds[r]!;

        for (let i = 0; i < currentRound.length; i++) {
          const match = currentRound[i]!;
          const isTeam1Empty = !match.team1_id;
          const isTeam2Empty = !match.team2_id;

          if (isTeam1Empty && isTeam2Empty) {
            // Both empty — mark as COMPLETED (dead match)
            if (match.status !== "COMPLETED") {
              match.status = "COMPLETED";
              changed = true;
            }
          } else if (isTeam1Empty || isTeam2Empty) {
            // BYE: one team present auto-advances
            if (match.status !== "COMPLETED") {
              match.status = "COMPLETED";
              match.team1_score = isTeam1Empty ? 0 : 1;
              match.team2_score = isTeam2Empty ? 0 : 1;

              const winnerId = isTeam1Empty ? match.team2_id : match.team1_id;

              // Propagate to parent match
              if (rounds[r + 1]) {
                const parentMatchIndex = Math.floor(i / 2);
                const parentMatch = rounds[r + 1]![parentMatchIndex]!;

                if (i % 2 === 0) {
                  if (parentMatch.team1_id !== winnerId) {
                    parentMatch.team1_id = winnerId;
                    changed = true;
                  }
                } else {
                  if (parentMatch.team2_id !== winnerId) {
                    parentMatch.team2_id = winnerId;
                    changed = true;
                  }
                }
              }
            }
          }
        }
      }
    }

    // Check for existing matches to prevent duplicates
    const { data: existingMatches } = await supabase
      .from("matches")
      .select("id")
      .eq("phase_id", phaseId)
      .limit(1);

    if (existingMatches && existingMatches.length > 0) {
      throw new Error(`Matches already exist for phase ${phaseId}. Delete them before regenerating.`);
    }

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
