import { supabase } from "@/lib/supabase";
import { notFound } from "next/navigation";
import { ExternalLink, Users, Settings2, GitMerge } from "lucide-react";
import Link from "next/link";
import { VisibilityToggle } from "./VisibilityToggle";

export default async function TournamentDashboard({ params }: { params: Promise<{ guildId: string; id: string }> }) {
  const { guildId, id: tournamentId } = await params;

  // Récupération Tournoi
  const { data: tournament, error } = await supabase.from('tournaments').select('*').eq('id', tournamentId).single();
  if (error || !tournament) notFound();

  // Récupération Phases pour Carte 3
  const { data: phases } = await supabase
    .from('phases')
    .select('*')
    .eq('tournament_id', tournamentId)
    .order('phase_order', { ascending: true });
  
  // Comptage des participants confirmés
  const { count: participantsCountRaw } = await supabase
    .from('teams')
    .select('*', { count: 'exact', head: true })
    .eq('tournament_id', tournamentId);
  const participantsCount = participantsCountRaw || 0;

  // États Configuration pour Carte 4
  const hasDiscordRoles = !!tournament.discord_captain_role_id || !!tournament.discord_to_role_id;
  const hasDiscordChannels = !!tournament.discord_announcement_channel_id || !!tournament.discord_checkin_channel_id;

  return (
    <div className="p-6 md:p-8 space-y-6 min-h-full bg-slate-950 text-slate-200">
      <header className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Vue d'ensemble</h1>
          <p className="text-slate-400">Gérez la structure, les paramètres et les participants de votre événement.</p>
        </div>
        <Link 
          href={`/${guildId}/tournaments/${tournamentId}`} 
          target="_blank"
          className="inline-flex items-center gap-2 text-sm font-medium text-blue-400 hover:text-blue-300 transition-colors"
        >
          Page publique <ExternalLink className="w-4 h-4" />
        </Link>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        {/* Card 1: Statut (Haut Gauche) */}
        <div className="bg-slate-900 rounded-xl p-6 border border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start mb-6">
            <div>
              <div className="flex items-center gap-3 mb-1">
                 <h2 className="text-xl font-bold text-white leading-tight">{tournament.name}</h2>
              </div>
              <p className="text-slate-400 text-sm font-medium">Splatoon 3</p>
            </div>
            {/* Composant Client */}
            <VisibilityToggle tournamentId={tournamentId} initialIsPublic={!!tournament.is_public} />
          </div>
          <div className="mt-8 pt-4 border-t border-slate-800">
            <p className="text-xs text-slate-500">
              {tournament.is_public 
                ? "Le tournoi est actuellement visible par tous les joueurs via l'URL publique." 
                : "Le tournoi est privé et masqué au grand public. Préparez-le avant de le publier."}
            </p>
          </div>
        </div>

        {/* Card 2: Participants (Haut Droite) */}
        <div className="bg-slate-900 rounded-xl p-6 border border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-slate-400" />
                Participants
              </h2>
              <Link 
                href={`/admin/${guildId}/tournaments/${tournamentId}/participants`}
                className="text-sm font-medium text-emerald-400 hover:text-emerald-300 flex items-center gap-1 transition-colors"
              >
                + Gérer
              </Link>
            </div>
            <p className="text-slate-400 text-sm mb-6 leading-relaxed">
              Consultez les équipes inscrites, validez leur check-in ou ajoutez-les manuellement pour vos brackets.
            </p>
          </div>
          <div className="bg-slate-950 rounded-lg p-4 border border-slate-800/50 flex justify-between items-center text-sm">
             <span className="text-slate-400">Équipes inscrites</span>
             <span className="font-bold text-white bg-slate-800 px-3 py-1 rounded-md">{participantsCount}</span>
          </div>
        </div>

        {/* Card 3: Structure (Bas Gauche) */}
        <div className="bg-slate-900 rounded-xl p-6 border border-slate-800 shadow-sm flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <GitMerge className="w-5 h-5 text-slate-400" />
              Structure
            </h2>
            <Link 
              href={`/admin/${guildId}/tournaments/${tournamentId}/structure`}
              className="text-sm font-medium text-emerald-400 hover:text-emerald-300 flex items-center gap-1 transition-colors"
            >
              + Nouv. phase
            </Link>
          </div>
          
          <div className="flex-1 space-y-3">
            {!phases || phases.length === 0 ? (
              <div className="text-center py-8 rounded-lg border border-dashed border-slate-800 bg-slate-950/50">
                <p className="text-sm text-slate-500">Aucune phase configurée pour le moment.</p>
              </div>
            ) : (
              phases.map((phase) => (
                <div key={phase.id} className="flex justify-between items-center p-3 rounded-lg bg-slate-950 border border-slate-800/50">
                  <div>
                    <h3 className="text-sm font-bold text-white mb-0.5">{phase.phase_order}. {phase.name}</h3>
                    <p className="text-xs text-slate-500">{phase.format.replace('_', ' ')} • {phase.max_groups ? `${phase.max_groups} Groupes` : `Arbre de ${phase.bracket_size}`}</p>
                  </div>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-800 text-slate-300">
                    {phase.status === 'PUBLISHED' ? 'Publié' : phase.status === 'COMPLETED' ? 'Terminé' : 'Brouillon'}
                  </span>
                </div>
              ))
            )}
          </div>
          <div className="mt-4 pt-4 border-t border-slate-800 text-center">
            <Link href={`/admin/${guildId}/tournaments/${tournamentId}/structure`} className="text-sm text-blue-400 hover:text-blue-300 font-medium transition-colors">
              Gérer l'arbre de tournoi
            </Link>
          </div>
        </div>

        {/* Card 4: Paramètres (Bas Droite) */}
        <div className="bg-slate-900 rounded-xl p-6 border border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Settings2 className="w-5 h-5 text-slate-400" />
              <h2 className="text-lg font-semibold text-white flex-1">Paramètres vitaux</h2>
            </div>
            <p className="text-slate-400 text-sm mb-6 leading-relaxed">
              Vérifiez la connexion avec Discord (rôles et salons) pour assurer le bon déroulement du bot en direct.
            </p>
            
            <ul className="space-y-3 mb-6">
              <li className="flex justify-between items-center text-sm p-3 rounded-lg bg-slate-950 border border-slate-800/50">
                <span className="text-slate-400">Salons d'annonce / Check-in</span>
                {hasDiscordChannels ? <span className="text-emerald-400 font-medium">Liés</span> : <span className="text-orange-400 font-medium">Manquants</span>}
              </li>
              <li className="flex justify-between items-center text-sm p-3 rounded-lg bg-slate-950 border border-slate-800/50">
                <span className="text-slate-400">Rôles Discord Automatiques</span>
                {hasDiscordRoles ? <span className="text-emerald-400 font-medium">Actifs</span> : <span className="text-orange-400 font-medium">Manquants</span>}
              </li>
            </ul>
          </div>
          
          <Link href={`/admin/${guildId}/tournaments/${tournamentId}/settings`} className="block w-full">
            <button className="w-full bg-slate-800 hover:bg-slate-700 text-white font-semibold py-2.5 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 border border-slate-700">
              <Settings2 className="w-4 h-4" />
              Continuer la configuration
            </button>
          </Link>
        </div>

      </div>
    </div>
  );
}