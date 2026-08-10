import { supabase } from "@/lib/supabase";
import { notFound } from "next/navigation";
import { PhaseConfigClient } from "./PhaseConfigClient";

export const dynamic = 'force-dynamic';

export default async function PhaseConfigPage({
  params
}: {
  params: Promise<{ guildId: string; id: string; phaseId: string }>
}) {
  const { guildId, id: tournamentId, phaseId } = await params;

  // Retrieve phase data
  const { data: phase, error } = await supabase
    .from('phases')
    .select('*')
    .eq('id', phaseId)
    .single();

  if (error || !phase) notFound();

  // For Round-Robin (Groupes) we also need to know the number of teams for size
  // Let's get the tournament context to ensure the user has teams registered
  const { count: teamsCount } = await supabase
    .from('teams')
    .select('*', { count: 'exact', head: true })
    .eq('tournament_id', tournamentId);

  return (
    <div className="space-y-6">
      <header className="mb-6 border-b border-slate-800 pb-4">
        <h1 className="text-2xl font-bold text-white">
          Structure / Configurer la phase "{phase.name}"
        </h1>
      </header>

      <PhaseConfigClient 
        phase={phase} 
        tournamentId={tournamentId} 
        guildId={guildId} 
        totalTeams={teamsCount || 0} 
      />
    </div>
  );
}
