import { TournamentAdminSidebarNav } from "@/components/TournamentAdminSidebarNav";
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
    <div className="flex flex-col lg:flex-row min-h-[calc(100vh-4rem)] bg-slate-900 text-white w-full relative">
      <TournamentAdminSidebarNav
        guildId={guildId}
        tournamentId={tournamentId}
        tournamentName={tournament.name}
      />

      {/* Main Tournament Content */}
      <main className="flex-1 p-6 md:p-8 overflow-y-auto flex flex-col">{children}</main>
    </div>
  );
}
