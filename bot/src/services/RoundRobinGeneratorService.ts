import { supabase } from "../lib/supabase";

export class RoundRobinGeneratorService {
  static async generateGroups(phaseId: string, groupCount: number = 1) {
    // 1. Retrieve current seeds
    const { data: seededRows, error: seedError } = await supabase
      .from("phase_teams")
      .select("team_id, seed")
      .eq("phase_id", phaseId)
      .order("seed", { ascending: true }); // Snake seeding uses this order

    if (seedError) throw seedError;
    const teams = seededRows || [];
    
    // Distribute into groups (Snake seeding for balance)
    const groups: { [key: string]: { team_id: string, seed: number }[] } = {};
    for (let i = 1; i <= groupCount; i++) {
        groups[i.toString()] = [];
    }

    let currentGroup = 1;
    let direction = 1;

    for (const t of teams) {
      groups[currentGroup.toString()]!.push(t as any);
      currentGroup += direction;
      // Bounce logic for snake seeding
      if (currentGroup > groupCount) {
        currentGroup = groupCount;
        direction = -1;
      } else if (currentGroup < 1) {
        currentGroup = 1;
        direction = 1;
      }
    }

    // Update phase_teams with their assigned group_name
    for (const [groupName, groupTeams] of Object.entries(groups)) {
      for (const t of groupTeams) {
        const { error } = await supabase
           .from("phase_teams")
           .update({ group_name: groupName })
           .match({ phase_id: phaseId, team_id: t.team_id });
        if (error) console.error("Error setting group_name", error);
      }
    }

    const matchesToInsert: any[] = [];
    let matchCounter = 1;

    for (const [groupName, groupTeams] of Object.entries(groups)) {
      // Round Robin algorithm (Circle Method)
      const teamIds = groupTeams.map(t => t.team_id);
      
      if (teamIds.length < 2) continue; // Not enough teams

      const hasBye = teamIds.length % 2 !== 0;
      if (hasBye) {
        teamIds.push("BYE");
      }

      const totalRounds = teamIds.length - 1;
      const matchesPerRound = teamIds.length / 2;

      for (let r = 1; r <= totalRounds; r++) {
        for (let i = 0; i < matchesPerRound; i++) {
          const t1 = teamIds[i];
          const t2 = teamIds[teamIds.length - 1 - i];

            if (t1 === "BYE" && t2 === "BYE") continue;

            const isByeMatch = t1 === "BYE" || t2 === "BYE";
            const realTeam1 = t1 === "BYE" ? (t2 as string) : (t1 as string);
            const realTeam2 = isByeMatch ? null : (t2 as string);

            matchesToInsert.push({
              phase_id: phaseId,
              group_id: groupName,
              team1_id: realTeam1,
              team2_id: realTeam2,
              round_number: r,
              match_number: matchCounter++,
              status: isByeMatch ? "BYE" : "PENDING"
            });
        }
        // Rotate array: keep first element fixed, move last element to index 1
        const lastTeam = teamIds.pop()!;
        teamIds.splice(1, 0, lastTeam);
      }
    }

    if (matchesToInsert.length > 0) {
      const { error: insertError } = await supabase
        .from("matches")
        .insert(matchesToInsert);

      if (insertError) {
        console.error("Erreur Bulk Insert Round Robin Matches: ", insertError);
        throw new Error("La cr�ation des matchs de poule a �chou�.");
      }
    }
  }
}
