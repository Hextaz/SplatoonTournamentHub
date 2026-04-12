import { supabase } from "@/lib/supabase";
import { Trophy, CheckCircle, Users } from "lucide-react";

export default async function AdminDashboard({
  params,
}: {
  params: Promise<{ guildId: string }>;
}) {
  const { guildId } = await params;

  // Exemples de requêtes pour le status global (Dashboard)
  const [
    { count: tournamentsCount },
    { count: activeTournamentsCount },
    { data: settings }
  ] = await Promise.all([
    supabase.from("tournaments").select("*", { count: "exact", head: true }).eq("guild_id", guildId),
    supabase.from("tournaments").select("*", { count: "exact", head: true }).eq("guild_id", guildId).eq("status", "in_progress"),
    supabase.from("server_settings").select("*").eq("guild_id", guildId).single()
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">📊 Dashboard (Statut global)</h1>
        <p className="text-slate-400">Vue d'ensemble de l'activité du serveur.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-md flex items-center justify-between">
          <div>
            <p className="text-slate-400 text-sm mb-1 uppercase tracking-wider">Tournois Total</p>
            <p className="text-3xl font-extrabold text-white">{tournamentsCount || 0}</p>
          </div>
          <div className="p-3 bg-blue-500/10 rounded-xl">
            <Trophy className="w-8 h-8 text-blue-400" />
          </div>
        </div>

        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-md flex items-center justify-between">
          <div>
            <p className="text-slate-400 text-sm mb-1 uppercase tracking-wider">En cours</p>
            <p className="text-3xl font-extrabold text-green-400">{activeTournamentsCount || 0}</p>
          </div>
          <div className="p-3 bg-green-500/10 rounded-xl">
            <CheckCircle className="w-8 h-8 text-green-400" />
          </div>
        </div>

        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-md flex justify-between items-center">
          <div>
            <p className="text-slate-400 text-sm mb-1 uppercase tracking-wider">Serveur Configuré ?</p>
            <p className="text-xl font-bold mt-1">
              {settings ? (
                <span className="text-green-400 flex items-center gap-2"><CheckCircle className="w-5 h-5"/> Oui</span>
              ) : (
                <span className="text-yellow-500">Non terminé</span>
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

