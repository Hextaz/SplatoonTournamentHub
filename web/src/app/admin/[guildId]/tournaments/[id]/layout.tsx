import Link from "next/link";
import { ArrowLeft, LayoutDashboard, Settings, Users, Sword, GitMerge } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { notFound } from "next/navigation";

export default async function TournamentAdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ guildId: string; id: string }>;
}) {
  const { guildId, id: tournamentId } = await params;

  // Fetch the tournament from the DB to display its name
  const { data: tournament, error } = await supabase
    .from("tournaments")
    .select("id, name, guild_id")
    .eq("id", tournamentId)
    .single();

  // If tournament doesn't exist or is not associated with the current server/guild, 404
  if (error || !tournament || tournament.guild_id !== guildId) {
    notFound();
  }

  return (
    <div className="flex flex-col md:flex-row min-h-[calc(100vh-4rem)] bg-slate-900 text-white w-full">
      {/* Tournament Admin Sidebar */}
      <aside className="w-full md:w-64 bg-slate-900 border-r border-slate-800 flex flex-col shrink-0">
        <div className="p-6 border-b border-slate-800">
          <Link
            href={`/admin/${guildId}/tournaments`}
            className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour aux tournois
          </Link>
          <h2 className="text-xl font-bold truncate" title={tournament.name}>
            {tournament.name}
          </h2>
          <p className="text-sm text-blue-400 mt-1">Espace Tournoi</p>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          <Link
            href={`/admin/${guildId}/tournaments/${tournamentId}`}
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <LayoutDashboard className="w-5 h-5" />
            Vue d'ensemble
          </Link>
          <Link
            href={`/admin/${guildId}/tournaments/${tournamentId}/settings`}
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <Settings className="w-5 h-5" />
            Paramètres
          </Link>
          <Link
            href={`/admin/${guildId}/tournaments/${tournamentId}/structure`}
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <GitMerge className="w-5 h-5" />
            Structure
          </Link>
          <Link
            href={`/admin/${guildId}/tournaments/${tournamentId}/participants`}
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <Users className="w-5 h-5" />
            Participants
          </Link>
          <Link
            href={`/admin/${guildId}/tournaments/${tournamentId}/matches`}
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <Sword className="w-5 h-5" />
            Matchs
          </Link>
        </nav>
      </aside>

      {/* Main Tournament Content */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}