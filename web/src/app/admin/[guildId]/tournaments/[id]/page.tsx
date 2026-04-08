import { supabase } from "@/lib/supabase";
import { Trophy, Calendar, Users, Target, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { PhaseManager } from "@/components/PhaseManager";

export default async function AdminTournamentDetailPage({
  params,
}: {
  params: Promise<{ guildId: string; id: string }>;
}) {
  const { guildId, id } = await params;

  // Concurrent fetching
  const [
    { data: tournament },
    { data: teams },
    // Optionally fetch an existing draft phase to edit
    { data: currentPhase }
  ] = await Promise.all([
    supabase.from("tournaments").select("*").eq("id", id).single(),
    supabase.from("teams").select("*").eq("tournament_id", id).eq("is_checked_in", true),
    supabase.from("phases").select("*").eq("tournament_id", id).eq("status", "draft").maybeSingle()
  ]);

  if (!tournament) {
    return (
      <div className="p-8 text-center text-slate-400">
        <p>Tournoi introuvable.</p>
        <Link href={`/admin/${guildId}/tournaments`} className="text-blue-500 hover:underline mt-4 inline-block">
          Retour à la gestion des tournois
        </Link>
      </div>
    );
  }

  const teamsCount = teams?.length || 0;
  const isPublishable = teamsCount > 1; // Needs at least 2 teams

  // Si on n'a pas de phase 'draft', on peut lui passer un ID fictif ou créer la phase au vol
  // Dans une vraie infra, on pourrait créer la phase DRAFT en BDD dès le clic "Générer un arbre"
  const phaseId = currentPhase?.id || `new-${tournament.id}`;

  return (
    <div className="space-y-8 pb-12">
      {/* HEADER & RECAP */}
      <div>
        <Link 
          href={`/admin/${guildId}/tournaments`}
          className="flex items-center text-sm text-slate-400 hover:text-white transition-colors mb-6 w-fit"
        >
          <ArrowLeft className="w-4 h-4 mr-2" /> Retour aux tournois
        </Link>

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-700 pb-6">
          <div>
            <h1 className="text-3xl font-extrabold text-white flex items-center gap-3">
              <Trophy className="w-8 h-8 text-yellow-400" />
              {tournament.name}
            </h1>
            <p className="text-slate-400 mt-2 max-w-2xl">{tournament.description || "Aucune description."}</p>
          </div>
          
          <div className="flex flex-col gap-2 shrink-0">
            <span className="bg-slate-800 text-slate-300 border border-slate-700 px-4 py-2 rounded-lg font-bold flex items-center gap-2">
              <Target className="w-4 h-4 text-blue-400" />
              Statut : <span className="uppercase text-white">{tournament.status}</span>
            </span>
          </div>
        </div>
      </div>

      {/* STATS WIDGETS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700/50 flex items-center justify-between">
          <div>
            <p className="text-slate-400 text-sm mb-1">Équipes Validées (Check-in)</p>
            <p className="text-3xl font-extrabold text-green-400">{teamsCount}</p>
          </div>
          <div className="p-3 bg-green-500/10 rounded-xl">
            <Users className="w-8 h-8 text-green-400" />
          </div>
        </div>

        <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700/50 flex items-center justify-between md:col-span-2">
          <div>
            <p className="text-slate-400 text-sm mb-1">Lancement</p>
            <p className="text-xl font-bold text-white flex items-center gap-2 mt-1">
              <Calendar className="w-5 h-5 text-blue-400" />
              {tournament.start_date 
                ? new Intl.DateTimeFormat('fr-FR', { dateStyle: 'full', timeStyle: 'short' }).format(new Date(tournament.start_date)) 
                : "Date non définie"}
            </p>
          </div>
        </div>
      </div>

      {/* SALLE DES MACHINES - SEEDING & BRACKET GENERATOR */}
      <div className="bg-slate-800/80 border border-slate-700 rounded-2xl shadow-xl overflow-hidden">
        <div className="bg-slate-900/50 p-6 border-b border-slate-700">
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            ⚙️ La Salle des Machines (Générateur & Seeding)
          </h2>
          <p className="text-slate-400 mt-1">
            Déplacez les équipes de la banque vers la colonne Seeding. Publiez ensuite la phase pour générer l'arbre des matchs.
          </p>
        </div>

        <div className="p-6">
          {!isPublishable ? (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400 font-medium text-lg">Il faut au moins 2 équipes check-in pour générer un arbre.</p>
              <p className="text-slate-500 text-sm mt-2">Actuellement : {teamsCount} équipe(s) prête(s).</p>
            </div>
          ) : (
            <PhaseManager 
              tournamentId={tournament.id} 
              phaseId={phaseId}
              initialTeams={teams || []} 
            />
          )}
        </div>
      </div>
    </div>
  );
}
