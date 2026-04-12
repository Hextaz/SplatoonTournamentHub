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
    .select("*, phase:phases!inner(name, tournament_id), team1:teams!team1_id(name), team2:teams!team2_id(name)")
    .eq("phase.tournament_id", tournamentId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching all matches:", error);
  }

  return (
    <MatchesOverviewClient
      guildId={guildId}
      tournamentId={tournamentId}
      allMatches={matches || []}
    />
  );
}
