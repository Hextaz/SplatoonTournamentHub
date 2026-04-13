import { supabase } from "../lib/supabase";

export class LeaderboardService {
  /**
   * Recalculates stats for all teams in a specific group and updates the phase_teams table.
   * Calculates played, wins, draws, losses, forfeits, score_for, score_against, differential, and points.
   */
  public static async calculateGroupStandings(groupId: string): Promise<void> {
    try {
      // 1. Get the group to find its phase_id
      const { data: group } = await supabase
        .from("groups")
        .select("phase_id")
        .eq("id", groupId)
        .single();
        
      if (!group) return;

      // 2. Fetch phase settings for points configuration
      const { data: phase } = await supabase
        .from("phases")
        .select("settings")
        .eq("id", group.phase_id)
        .single();

      if (!phase) return;

      const settings = typeof phase.settings === 'string' ? JSON.parse(phase.settings) : (phase.settings || {});
      const pointsWin = settings.points_win ?? 3;
      const pointsDraw = settings.points_draw ?? 1;
      const pointsLoss = settings.points_loss ?? 0;
      const pointsForfeit = settings.points_forfeit ?? 0;

      // 3. Fetch all teams currently in this group
      const { data: groupTeams } = await supabase
        .from("phase_teams")
        .select("team_id, phase_id")
        .eq("group_id", groupId);

      if (!groupTeams || groupTeams.length === 0) return;

      // Initialize stats map for each team
      const statsMap: Record<string, any> = {};
      for (const t of groupTeams) {
        statsMap[t.team_id] = {
          played: 0,
          wins: 0,
          draws: 0,
          losses: 0,
          forfeits: 0, // Currently no explicit 'FORFEIT' status mapped in ScoreService, but reserved for future
          score_for: 0,
          score_against: 0,
          differential: 0,
          points: 0
        };
      }

      // 4. Fetch all COMPLETED matches for this group
      const { data: matches } = await supabase
        .from("matches")
        .select("team1_id, team2_id, team1_score, team2_score, status")
        .eq("group_id", groupId)
        .eq("status", "COMPLETED");

      // 5. Calculate statistics
      if (matches && matches.length > 0) {
        for (const match of matches) {
          const t1 = match.team1_id;
          const t2 = match.team2_id;
          const s1 = match.team1_score || 0;
          const s2 = match.team2_score || 0;

          // Process Team 1
          if (t1 && statsMap[t1]) {
            statsMap[t1].played += 1;
            statsMap[t1].score_for += s1;
            statsMap[t1].score_against += s2;

            if (s1 > s2) statsMap[t1].wins += 1;
            else if (s1 < s2) statsMap[t1].losses += 1;
            else statsMap[t1].draws += 1;
          }

          // Process Team 2
          if (t2 && statsMap[t2]) {
            statsMap[t2].played += 1;
            statsMap[t2].score_for += s2;
            statsMap[t2].score_against += s1;

            if (s2 > s1) statsMap[t2].wins += 1;
            else if (s2 < s1) statsMap[t2].losses += 1;
            else statsMap[t2].draws += 1;
          }
        }
      }

      // 6. Finalize calculations (differential and points) and prepare bulk update
      // Since Supabase doesn't easily support bulk update via REST without a true upsert on PK safely in this context,
      // we'll update them one by one considering groups rarely have more than 4-8 teams.
      const updatePromises = [];

      for (const t of groupTeams) {
        const stats = statsMap[t.team_id];
        stats.differential = stats.score_for - stats.score_against;
        stats.points = (stats.wins * pointsWin) + (stats.draws * pointsDraw) + (stats.losses * pointsLoss) + (stats.forfeits * pointsForfeit);

        const promise = supabase
          .from("phase_teams")
          .update({
            played: stats.played,
            wins: stats.wins,
            draws: stats.draws,
            losses: stats.losses,
            forfeits: stats.forfeits,
            score_for: stats.score_for,
            score_against: stats.score_against,
            differential: stats.differential,
            points: stats.points
          })
          .eq("phase_id", t.phase_id)
          .eq("team_id", t.team_id);
          
        updatePromises.push(promise);
      }

      await Promise.all(updatePromises);
      console.log(`[LeaderboardService] Successfully updated standings for group ${groupId}`);

    } catch (error) {
      console.error(`[LeaderboardService] Error calculating group standings for ${groupId}:`, error);
    }
  }
}
