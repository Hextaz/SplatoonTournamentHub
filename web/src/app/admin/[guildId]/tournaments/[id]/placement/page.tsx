import { supabase } from "@/lib/supabase";
import { notFound } from "next/navigation";
import { PlacementClient } from "./PlacementClient";

export default async function PlacementPage({
  params
}: {
  params: Promise<{ guildId: string; id: string }>;
}) {
  const { guildId, id: tournamentId } = await params;

  // 1. Fetch DRAFT phase (assuming only one phase is seeded at a time)
  const { data: phase, error: phaseError } = await supabase
    .from("phases")
    .select("*")
    .eq("tournament_id", tournamentId)
    .order("phase_order", { ascending: true })
    .limit(1)
    .single();

  if (phaseError && phaseError.code !== 'PGRST116') {
    console.error("Phase fetch error", phaseError);
  }

  // 2. Fetch all checked-in teams
  const { data: teams, error: teamsError } = await supabase
    .from("teams")
    .select("*")
    .eq("tournament_id", tournamentId)
    .eq("is_checked_in", true);

  if (teamsError) {
    console.error("Teams fetch error", teamsError);
  }

  return (
    <div className="p-6 md:p-8 space-y-6 min-h-[calc(100vh-2rem)] flex flex-col">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Placement & Seeding</h1>
        <p className="text-slate-400">Glissez-déposez les équipes pour définir le seeding de la phase en cours.</p>
      </div>

      {!phase ? (
        <div className="bg-orange-500/10 border border-orange-500/20 text-orange-400 p-6 rounded-xl text-center">
          Aucune phase en DRAFT trouvée. Veuillez générer une phase depuis l'onglet Structure d'abord.
        </div>
      ) : (
        <PlacementClient 
          tournamentId={tournamentId} 
          guildId={guildId} 
          phase={phase} 
          availableTeams={teams || []} 
        />
      )}
    </div>
  );
}