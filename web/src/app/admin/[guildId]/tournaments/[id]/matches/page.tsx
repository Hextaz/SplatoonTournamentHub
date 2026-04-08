import { supabase } from "@/lib/supabase";
import { notFound } from "next/navigation";
import { MatchesClient } from "./MatchesClient";

export default async function MatchesPage({
  params
}: {
  params: Promise<{ guildId: string; id: string }>;
}) {
  const { guildId, id: tournamentId } = await params;

  // 1. Fetch published phase
  const { data: phase, error: phaseError } = await supabase
    .from("phases")
    .select("*")
    .eq("tournament_id", tournamentId)
    .eq("status", "PUBLISHED")
    .order("phase_order", { ascending: true })
    .limit(1)
    .single();

  if (phaseError && phaseError.code !== 'PGRST116') {
    console.error("Phase fetch error", phaseError);
  }

  // 2. Fetch matches for that phase
  let matches = [];
  if (phase) {
    const { data: fetchedMatches, error: matchesError } = await supabase
      .from("matches")
      .select("*, team1:teams!matches_team1_id_fkey(*), team2:teams!matches_team2_id_fkey(*)")
      .eq("phase_id", phase.id)
      .order("round_number", { ascending: true })
      .order("match_number", { ascending: true });

    if (matchesError) {
       console.error("Matches Error", matchesError);
    } else {
       matches = fetchedMatches || [];
    }
  }

  return (
    <div className="p-6 md:p-8 space-y-6 min-h-[calc(100vh-2rem)] flex flex-col">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Matchs & Arbitrage</h1>
        <p className="text-slate-400">Forcez les résultats et observez l'avancée du tournoi de manière omnisciente.</p>
      </div>

      {!phase ? (
        <div className="bg-blue-500/10 border border-blue-500/20 text-blue-400 p-6 rounded-xl text-center shadow-lg animate-pulse">
          L'arbre n'a pas encore été publié. Terminez le placement des équipes puis publiez la phase pour générer les matchs.
        </div>
      ) : (
        <MatchesClient 
          tournamentId={tournamentId} 
          guildId={guildId} 
          phase={phase} 
          initialMatches={matches}
        />
      )}
    </div>
  );
}