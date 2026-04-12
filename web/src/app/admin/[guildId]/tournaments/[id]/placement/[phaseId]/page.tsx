import { supabase } from "@/lib/supabase";
import { notFound } from "next/navigation";
import { PlacementPhaseClient } from "./PlacementPhaseClient";

export default async function PlacementPhasePage({
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

  if (phaseError || !phase) notFound();

  // 2. Fetch checked-in teams
  const { data: teams, error: teamsError } = await supabase
    .from("teams")
    .select("*")
    .eq("tournament_id", tournamentId)
    .eq("is_checked_in", true);

  // 3. Fetch existing assignments (seeds)
  const { data: phaseTeams, error: ptError } = await supabase
    .from("phase_teams")
    .select("team_id, seed, teams(*)")
    .eq("phase_id", phaseId)
    .order("seed", { ascending: true });

  return (
    <div className="min-h-[calc(100vh-2rem)] flex flex-col p-6 md:p-8">
      <header className="mb-6 flex justify-between items-end">
        <div>
          <div className="text-sm text-blue-400 font-bold mb-1 tracking-wider uppercase">Placement</div>
          <h1 className="text-3xl font-bold text-white leading-tight">
            {phase.name}
          </h1>
        </div>
      </header>

      <PlacementPhaseClient 
        tournamentId={tournamentId} 
        guildId={guildId} 
        phase={phase} 
        availableTeams={teams || []} 
        initialPhaseTeams={phaseTeams || []}
      />
    </div>
  );
}
