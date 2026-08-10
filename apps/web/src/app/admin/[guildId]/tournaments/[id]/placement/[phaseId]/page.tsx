export const dynamic = 'force-dynamic';
import { supabaseAdmin } from "@/lib/supabase-admin";
import { notFound } from "next/navigation";
import { PlacementPhaseClient } from "./PlacementPhaseClient";

export default async function PlacementPhasePage({
  params
}: {
  params: Promise<{ guildId: string; id: string; phaseId: string }>;
}) {
  const { guildId, id: tournamentId, phaseId } = await params;

  // 1. Fetch phase
  const { data: phase, error: phaseError } = await supabaseAdmin
    .from("phases")
    .select("*")
    .eq("id", phaseId)
    .single();

  if (phaseError || !phase) notFound();

  // 2. Fetch checked-in teams (fallback to all teams if none checked-in)
  let { data: teams } = await supabaseAdmin
    .from("teams")
    .select("*")
    .eq("tournament_id", tournamentId)
    .eq("is_checked_in", true);

  if (!teams || teams.length === 0) {
    const { data: allTeams } = await supabaseAdmin
      .from("teams")
      .select("*")
      .eq("tournament_id", tournamentId);
    teams = allTeams || [];
  }

  // 3. Fetch existing assignments (seeds)
  const { data: phaseTeams } = await supabaseAdmin
    .from("phase_teams")
    .select("team_id, seed, teams(*)")
    .eq("phase_id", phaseId)
    .order("seed", { ascending: true });

  return (
    <div className="min-h-[calc(100vh-2rem)] flex flex-col p-6 md:p-8">
      <header className="mb-6 flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4">
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
