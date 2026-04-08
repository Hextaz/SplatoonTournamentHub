import { supabase } from "@/lib/supabase";
import { notFound } from "next/navigation";
import { Trophy, ShieldAlert, Users } from "lucide-react";
import Link from "next/link";
import dayjs from "dayjs";
import "dayjs/locale/fr";

dayjs.locale("fr");

export default async function TournamentDashboard({ params }: { params: Promise<{ guildId: string; id: string }> }) {
  const { guildId, id: tournamentId } = await params;

  const { data: tournament, error } = await supabase.from('tournaments').select('*').eq('id', tournamentId).single();
  if (error || !tournament) notFound();

  const isStructureSet = false;
  const participantsCount = 0;

  return (
    <div className="p-6 md:p-8 space-y-6 min-h-full">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Tableau de Bord</h1>
        <p className="text-slate-400">Vue d'ensemble de la progression du tournoi.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
          <div className="flex items-center gap-3 mb-4">
             <Trophy className="text-blue-400 w-6 h-6" />
             <h2 className="text-xl font-bold text-white">Statut</h2>
          </div>
          <div className="text-2xl font-bold text-blue-400">
            {tournament.status === 'REGISTRATION' ? 'Inscriptions Ouvertes' : tournament.status}
          </div>
          <p className="text-slate-400 text-sm mt-2">Date : {dayjs(tournament.start_at).format('DD MMMM YYYY à HH:mm')}</p>
        </div>

        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <ShieldAlert className="text-orange-400 w-6 h-6" />
              <h2 className="text-xl font-bold text-white">Structure</h2>
            </div>
            <p className="text-slate-400 text-sm">
              {isStructureSet ? "Une structure de tournoi a été définie." : "Aucune structure (arbre / poules) n'est configurée."}
            </p>
          </div>
          {!isStructureSet && (
            <div className="mt-4">
              <Link href={`/admin/${guildId}/tournaments/${tournamentId}/structure`} className="text-orange-400 hover:text-orange-300 text-sm font-semibold flex items-center gap-1">
                 Configurer la structure &rarr;
              </Link>
            </div>
          )}
        </div>

        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
          <div className="flex items-center gap-3 mb-4">
             <Users className="text-green-400 w-6 h-6" />
             <h2 className="text-xl font-bold text-white">Participants</h2>
          </div>
          <div className="text-3xl font-bold text-white">{participantsCount}</div>
          <p className="text-slate-400 text-sm mt-1">Inscrits</p>
        </div>
      </div>

      {tournament.description && (
        <section className="bg-slate-800 rounded-xl p-6 border border-slate-700 mt-6">
          <h3 className="text-lg font-bold text-white mb-4">Description</h3>
          <div className="prose prose-invert max-w-none text-slate-300">
            <p className="whitespace-pre-wrap">{tournament.description}</p>
          </div>
        </section>
      )}
    </div>
  );
}