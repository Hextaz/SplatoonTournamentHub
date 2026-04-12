import { supabase } from "@/lib/supabase";
import { Calendar, Monitor, Users, ExternalLink } from "lucide-react";
import Link from "next/link";

export default async function PublicTournamentOverview({
  params,
}: {
  params: Promise<{ guildId: string; id: string }>;
}) {
  const { guildId, id } = await params;

  // Parallel fetching
  const [
    { data: tournament },
    { data: phases },
    { data: teams }
  ] = await Promise.all([
    supabase.from("tournaments").select("*").eq("id", id).single(),
    supabase.from("phases").select("id").eq("tournament_id", id),
    supabase.from("teams").select("id").eq("tournament_id", id).eq("is_checked_in", true)
  ]);

  if (!tournament) return null;

  const totalTeams = teams?.length || 0;

  // Manual fetching of matches
  let matches: any[] = [];
  if (phases && phases.length > 0) {
    const phaseIds = phases.map(p => p.id);
    const { data } = await supabase
      .from("matches")
      .select("*, team1:team1_id(*), team2:team2_id(*), phase:phase_id(name, phase_order)")
      .in("phase_id", phaseIds);
    if (data) matches = data;
  }

  // Split into recent and upcoming and limit to 4
  const recentMatches = matches
    .filter(m => m.status === 'COMPLETED' || m.status === 'FF' || m.status === 'BYE')
    .sort((a, b) => {
      const orderA = a.phase?.phase_order || 0;
      const orderB = b.phase?.phase_order || 0;
      if (orderB !== orderA) return orderB - orderA;
      
      const dateA = new Date(a.updated_at || a.created_at).getTime();
      const dateB = new Date(b.updated_at || b.created_at).getTime();
      return dateB - dateA;
    })
    .slice(0, 4);

  const upcomingMatches = matches
    .filter(m => m.status !== 'COMPLETED' && m.status !== 'FF' && m.status !== 'BYE')
    .sort((a, b) => {
      const orderA = a.phase?.phase_order || 0;
      const orderB = b.phase?.phase_order || 0;
      if (orderA !== orderB) return orderA - orderB;
      
      const roundA = a.round_number || 0;
      const roundB = b.round_number || 0;
      if (roundA !== roundB) return roundA - roundB;
      
      return (a.match_number || 0) - (b.match_number || 0);
    })
    .slice(0, 4);

  return (
    <div className="space-y-12 animate-in fade-in duration-300">
      {/* Recent Matches Section - Split into two columns like Toornament overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div>
          <div className="flex text-sm text-slate-400 border-b border-slate-800/50 mb-4 pb-2">
            <span className="font-semibold text-slate-200 border-b-2 border-slate-200 px-2 pb-[10px] -mb-[10px]">
              Derniers résultats
            </span>
          </div>
          <div className="space-y-3">
            {recentMatches.length === 0 ? (
              <p className="text-slate-500 py-4 text-center bg-[#151722] rounded-lg border border-slate-800/30">
                Aucun match terminé
              </p>
            ) : (
              recentMatches.map(match => {
                const s1 = match.team1_score || 0;
                const s2 = match.team2_score || 0;
                const isBye = match.status === 'BYE';
                const team1Wins = s1 > s2 || isBye;
                const team2Wins = s2 > s1 && !isBye;

                return (
                  <div key={match.id} className="bg-[#151722] border border-slate-800/50 hover:bg-[#1a1d2d] transition-colors rounded overflow-hidden flex flex-col font-mono text-sm shadow-sm cursor-pointer group">
                    <div className="text-xs text-slate-500 px-3 py-1.5 border-b border-slate-800/50 bg-[#12141d]">
                      {match.phase?.name || 'Match'} • Round {match.round_number || '?'}
                    </div>
                    <div className="flex flex-col p-2">
                      <div className="flex justify-between items-center py-1.5 px-2 hover:bg-slate-800/20 rounded">
                        <span className={`font-semibold ${team1Wins ? 'text-slate-200' : 'text-slate-400'}`}>
                          {match.team1?.name || "TBD"}
                        </span>
                        <div className="flex items-center gap-3">
                          {!isBye && <span className="text-slate-300 font-bold">{s1}</span>}
                          {isBye && <span className="text-green-500 font-bold text-xs uppercase">Auto</span>}
                          {team1Wins ? (
                            <span className="w-5 h-5 flex items-center justify-center bg-green-500/20 text-green-400 rounded text-[10px] font-bold">V</span>
                          ) : (
                            <span className="w-5 h-5 flex items-center justify-center bg-slate-800 text-slate-500 rounded text-[10px] font-bold">D</span>
                          )}
                        </div>
                      </div>
                      <div className="flex justify-between items-center py-1.5 px-2 hover:bg-slate-800/20 rounded">
                        <span className={`font-semibold ${team2Wins ? 'text-slate-200' : 'text-slate-400'}`}>
                          {isBye ? "BYE" : (match.team2?.name || "TBD")}
                        </span>
                        <div className="flex items-center gap-3">
                          {!isBye && <span className="text-slate-300 font-bold">{s2}</span>}
                          {team2Wins ? (
                            <span className="w-5 h-5 flex items-center justify-center bg-green-500/20 text-green-400 rounded text-[10px] font-bold">V</span>
                          ) : (
                            <span className="w-5 h-5 flex items-center justify-center bg-slate-800 text-slate-500 rounded text-[10px] font-bold">D</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div>
          <div className="flex text-sm text-slate-400 border-b border-slate-800/50 mb-4 pb-2">
            <span className="font-semibold text-slate-200 border-b-2 border-slate-200 px-2 pb-[10px] -mb-[10px]">
              À venir
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
                  <div className="text-xs text-slate-500 px-3 py-1.5 border-b border-slate-800/50 bg-[#12141d]">
                    {match.phase?.name || 'Match'} • Round {match.round_number || '?'}
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

      {/* Information Cards section */}
      <div>
        <h2 className="text-xl font-bold text-slate-200 mb-6">Informations</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-[#151722] border border-slate-800/50 p-5 rounded-lg flex items-start gap-4 hover:border-slate-700 transition-colors">
            <div className="w-10 h-10 bg-slate-800 rounded flex items-center justify-center shrink-0">
               {/* Placeholder Splatoon Icon */}
               <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6 text-orange-500"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-200">Splatoon 3</p>
              <p className="text-xs text-slate-500 mt-1">Switch</p>
            </div>
          </div>
          
          <div className="bg-[#151722] border border-slate-800/50 p-5 rounded-lg flex items-start gap-4 hover:border-slate-700 transition-colors">
            <div className="w-10 h-10 bg-slate-800 rounded flex items-center justify-center shrink-0">
              <Users className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-200">Taille</p>
              <p className="text-xs text-slate-500 mt-1">{totalTeams} Équipes (4 joueurs)</p>
            </div>
          </div>

          <div className="bg-[#151722] border border-slate-800/50 p-5 rounded-lg flex items-start gap-4 hover:border-slate-700 transition-colors">
            <div className="w-10 h-10 bg-slate-800 rounded flex items-center justify-center shrink-0">
              <Monitor className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-200">Format</p>
              <p className="text-xs text-slate-500 mt-1">Online</p>
            </div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-[#151722] border border-slate-800/50 p-5 rounded-lg flex items-start gap-4 hover:border-slate-700 transition-colors">
            <div className="w-10 h-10 bg-slate-800 rounded flex items-center justify-center shrink-0 mt-1">
              <Calendar className="w-5 h-5 text-slate-400" />
            </div>
            <div className="w-full">
              <p className="text-sm font-semibold text-slate-200 mb-3">Planning</p>
                <div className="flex flex-col gap-1 bg-slate-800/40 p-3 rounded text-sm text-slate-400 font-mono">
                  <span className="text-xs text-slate-500 uppercase tracking-widest font-sans">Dates du tournoi</span>
                  <span className="text-slate-200">
                  {tournament.start_at ? new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short' }).format(new Date(tournament.start_at)) : 'TBD'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
