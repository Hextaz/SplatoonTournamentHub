import { supabase } from "@/lib/supabase";
import { RealtimeMatchesList } from "@/components/RealtimeMatchesList";

export default async function PublicMatchesPage({
  params,
}: {
  params: Promise<{ guildId: string; id: string }>;
}) {
  const { id } = await params;

  // Get phase IDs via tournament
  const { data: phases } = await supabase.from("phases").select("id").eq("tournament_id", id);
  
  let matches: any[] = [];
  if (phases && phases.length > 0) {
    const phaseIds = phases.map(p => p.id);
    const { data } = await supabase
      .from("matches")
      .select("*, team1:team1_id(*), team2:team2_id(*), phase:phase_id(name, phase_order)")
      .in("phase_id", phaseIds);
    if (data) matches = data;
  }

  if (!matches || matches.length === 0) {
    return (
      <div className="py-12 bg-[#151722] rounded-xl border border-slate-800/50 flex flex-col items-center justify-center text-slate-500 animate-in fade-in duration-300">
        <p>Aucun match disponible pour le moment.</p>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in duration-300">
      <RealtimeMatchesList initialMatches={matches} tournamentId={id} />
    </div>
  );
}