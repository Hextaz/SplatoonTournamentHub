import { supabase } from "@/lib/supabase";

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
      .select("*, team1:team1_id(*), team2:team2_id(*), phase:phase_id(name)")
      .in("phase_id", phaseIds)
      .order("created_at", { ascending: false });
    if (data) matches = data;
  }

  if (!matches || matches.length === 0) {
    return (
      <div className="py-12 bg-[#151722] rounded-xl border border-slate-800/50 flex flex-col items-center justify-center text-slate-500 animate-in fade-in duration-300">
        <p>Aucun match disponible pour le moment.</p>
      </div>
    );
  }

  // Split into recent and upcoming
  const recentMatches = matches.filter(m => m.status === 'COMPLETED' || m.status === 'FF');
  const upcomingMatches = matches.filter(m => m.status !== 'COMPLETED' && m.status !== 'FF');

  return (
    <div className="space-y-12 animate-in fade-in duration-300">
      {/* Container split into two columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Derniers résultats */}
        <div>
          <div className="flex text-sm text-slate-400 border-b border-slate-800/50 mb-4 pb-2">
            <span className="font-semibold text-slate-200 border-b-2 border-slate-200 px-2 pb-[10px] -mb-[10px]">
              Derniers résultats ({recentMatches.length})
            </span>
          </div>
          <div className="space-y-3">
            {recentMatches.length === 0 ? (
              <p className="text-slate-500 py-4 text-center bg-[#151722] rounded-lg border border-slate-800/30">
                Aucun match terminé
              </p>
            ) : (
              recentMatches.map(match => (
                <div key={match.id} className="bg-[#151722] border border-slate-800/50 hover:bg-[#1a1d2d] transition-colors rounded overflow-hidden flex flex-col font-mono text-sm shadow-sm cursor-pointer group">
                  <div className="text-xs text-slate-500 px-3 py-1.5 border-b border-slate-800/50 bg-[#12141d] flex justify-between">
                    <span>{match.phase?.name} • Round {match.round_number || '?'}</span>
                    <span className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400">Match #{match.match_number}</span>
                  </div>
                  <div className="flex flex-col p-2">
                    <div className="flex justify-between items-center py-1.5 px-2 hover:bg-slate-800/20 rounded">
                      <span className={`font-semibold ${match.score1 > match.score2 ? 'text-slate-200' : 'text-slate-400'}`}>
                        {match.team1?.name || "TBD"}
                      </span>
                      <div className="flex items-center gap-3">
                        <span className="text-slate-300 font-bold">{match.score1 || 0}</span>
                        {match.score1 > match.score2 ? <span className="w-5 h-5 flex items-center justify-center bg-green-500/20 text-green-400 rounded text-[10px] font-bold">V</span> : <span className="w-5 h-5 flex items-center justify-center bg-slate-800 text-slate-500 rounded text-[10px] font-bold">D</span>}
                      </div>
                    </div>
                    <div className="flex justify-between items-center py-1.5 px-2 hover:bg-slate-800/20 rounded">
                      <span className={`font-semibold ${match.score2 > match.score1 ? 'text-slate-200' : 'text-slate-400'}`}>
                        {match.team2?.name || "TBD"}
                      </span>
                      <div className="flex items-center gap-3">
                        <span className="text-slate-300 font-bold">{match.score2 || 0}</span>
                        {match.score2 > match.score1 ? <span className="w-5 h-5 flex items-center justify-center bg-green-500/20 text-green-400 rounded text-[10px] font-bold">V</span> : <span className="w-5 h-5 flex items-center justify-center bg-slate-800 text-slate-500 rounded text-[10px] font-bold">D</span>}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* À venir */}
        <div>
          <div className="flex text-sm text-slate-400 border-b border-slate-800/50 mb-4 pb-2">
            <span className="font-semibold text-slate-200 border-b-2 border-slate-200 px-2 pb-[10px] -mb-[10px]">
              À venir ({upcomingMatches.length})
            </span>
          </div>
          <div className="space-y-3">
            {upcomingMatches.length === 0 ? (
              <p className="text-slate-500 py-4 text-center bg-[#151722] rounded-lg border border-slate-800/30">
                Aucun match programmé
              </p>
            ) : (
              upcomingMatches.map(match => (
                <div key={match.id} className="bg-[#151722] border border-slate-800/50 hover:bg-[#1a1d2d] transition-colors rounded overflow-hidden flex flex-col font-mono text-sm shadow-sm cursor-pointer group">
                  <div className="text-xs text-slate-500 px-3 py-1.5 border-b border-slate-800/50 bg-[#12141d] flex justify-between">
                    <span>{match.phase?.name} • Round {match.round_number || '?'}</span>
                    <span className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400">Match #{match.match_number}</span>
                  </div>
                  <div className="flex flex-col p-2 text-slate-300">
                    <div className="flex justify-between items-center py-1.5 px-2 hover:bg-slate-800/20 rounded">
                      <span>{match.team1?.name || "TBD"}</span>
                      <span className="text-slate-500">-</span>
                    </div>
                    <div className="flex justify-between items-center py-1.5 px-2 hover:bg-slate-800/20 rounded">
                      <span>{match.team2?.name || "TBD"}</span>
                      <span className="text-slate-500">-</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}