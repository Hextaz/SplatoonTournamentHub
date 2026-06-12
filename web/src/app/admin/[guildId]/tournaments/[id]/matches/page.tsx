import { supabase } from "@/lib/supabase";
import { MatchesOverviewClient } from "./MatchesOverviewClient";

export default async function MatchesOverviewPage({
  params
}: {
  params: Promise<{ guildId: string; id: string }>;
}) {
  const { guildId, id: tournamentId } = await params;

  // Fetch all matches for the tournament, joined with phase and teams
  const { data: matches, error } = await supabase
    .from("matches")
    .select("*, phase:phases!inner(name, tournament_id, phase_order), team1:teams!team1_id(name), team2:teams!team2_id(name)")
    .eq("phase.tournament_id", tournamentId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching all matches:", error);
  }

  // Trier les matchs : d'abord par ordre de la phase (phase_order), puis par round_number, puis par match_number
  const sortedMatches = (matches || []).sort((a: any, b: any) => {
    if (a.phase?.phase_order !== b.phase?.phase_order) {
      return (a.phase?.phase_order || 0) - (b.phase?.phase_order || 0);
    }
    if (a.round_number !== b.round_number) {
      return a.round_number - b.round_number;
    }
    return a.match_number - b.match_number;
  });

  return (
    <MatchesOverviewClient
      guildId={guildId}
      tournamentId={tournamentId}
      allMatches={sortedMatches}
    />
  );
}
