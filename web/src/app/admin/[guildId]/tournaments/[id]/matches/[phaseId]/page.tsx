import { supabase } from "@/lib/supabase";
import { notFound } from "next/navigation";
import { PhaseMatchesClient } from "./PhaseMatchesClient";

export default async function PhaseMatchesPage({
  params
}: {
  params: Promise<{ guildId: string; id: string; phaseId: string }>;
}) {
  const { guildId, id: tournamentId, phaseId } = await params;

  // 1. Fetch phase
  const { data: phase, error: phaseError } = await supabase
    .from("phases")
    .select("*")
    .eq("id", phaseId)
    .single();

  if (phaseError || !phase) {
    return notFound();
  }

  // 2. Fetch matches for that phase
  const { data: matches, error: matchesError } = await supabase
    .from("matches")
    .select("*, team1:teams!team1_id(name), team2:teams!team2_id(name)")
    .eq("phase_id", phase.id)
    .order("round_number", { ascending: true })
    .order("match_number", { ascending: true });

  if (matchesError) {
    console.error("Matches Error", matchesError);
  }

  return (
    <PhaseMatchesClient 
      tournamentId={tournamentId} 
      guildId={guildId} 
      phase={phase} 
      initialMatches={matches || []}
    />
  );
}
