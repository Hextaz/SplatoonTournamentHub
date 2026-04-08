import { supabase } from "@/lib/supabase";
import { Trophy, ArrowLeft, Calendar } from "lucide-react";
import Link from "next/link";
import { PublicTournamentTabs } from "@/components/PublicTournamentTabs";

export default async function PublicTournamentPage({
  params,
}: {
  params: Promise<{ guildId: string; id: string }>;
}) {
  const { guildId, id } = await params;

  // Parallel fetching
  const [
    { data: tournament },
    { data: teams },
    { data: phases },
    { data: matches }
  ] = await Promise.all([
    supabase.from("tournaments").select("*").eq("id", id).single(),
    supabase.from("teams").select("*").eq("tournament_id", id).eq("is_checked_in", true),
    supabase.from("phases").select("*").eq("tournament_id", id).order("phase_order", { ascending: true }),
    supabase.from("matches").select("*").eq("tournament_id", id).order("round_number", { ascending: true })
  ]);

  if (!tournament) {
    return (
      <div className="min-h-[calc(100vh-4rem)] p-8 text-center text-slate-400 bg-slate-900">
        <p className="text-xl">Tournoi introuvable.</p>
        <Link href={`/${guildId}`} className="text-blue-500 hover:text-blue-400 mt-4 inline-block">
          Retour aux tournois du serveur
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-900 text-white flex flex-col">
      {/* Header */}
      <header className="bg-slate-800 border-b border-slate-700 sticky top-0 z-10 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center">
              <Link 
                href={`/${guildId}`}
                className="p-2 mr-4 rounded-full bg-slate-700/50 hover:bg-slate-600 text-slate-300 transition-colors shadow-sm"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div className="flex items-center gap-4">
                <div className="p-3 bg-yellow-500/10 rounded-xl">
                  <Trophy className="w-8 h-8 text-yellow-400" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-slate-100 truncate max-w-[300px] sm:max-w-md lg:max-w-2xl">
                    {tournament.name}
                  </h1>
                  <div className="flex items-center gap-4 text-sm text-slate-400 mt-1">
                    <span className="flex items-center bg-slate-700/50 px-2 py-1 rounded-md">
                      Vue publique
                    </span>
                    {tournament.start_date && (
                      <span className="flex items-center">
                        <Calendar className="w-3.5 h-3.5 mr-1" />
                        {new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' }).format(new Date(tournament.start_date))}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
            
            {/* Contextual Action (Future reference) */}
            <div className="hidden sm:block">
               {/* Empty placeholder for aesthetic balance or social share button */}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Tournament Overview Text */}
          {tournament.description && (
            <div className="mb-8 p-6 bg-slate-800/30 rounded-2xl border border-slate-700/50">
              <h2 className="text-lg font-semibold text-slate-300 mb-2">À propos de ce tournoi</h2>
              <p className="text-slate-400 leading-relaxed max-w-4xl whitespace-pre-wrap">
                {tournament.description}
              </p>
            </div>
          )}

          <PublicTournamentTabs 
            tournament={tournament} 
            teams={teams || []} 
            phases={phases || []} 
            matches={matches || []} 
          />
        </div>
      </main>
    </div>
  );
}
