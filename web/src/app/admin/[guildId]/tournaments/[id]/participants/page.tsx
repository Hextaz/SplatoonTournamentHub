import { supabase } from "@/lib/supabase";
import { notFound } from "next/navigation";
import { ParticipantsClient } from "./ParticipantsClient";

export default async function ParticipantsPage({
  params
}: {
  params: Promise<{ guildId: string; id: string }>;
}) {
  const { guildId, id: tournamentId } = await params;

  const { data: tournament, error: tournamentError } = await supabase
    .from("tournaments")
    .select("*")
    .eq("id", tournamentId)
    .single();

  if (tournamentError || !tournament) notFound();

  // Fetch teams
  const { data: teams, error: teamsError } = await supabase
    .from("teams")
    .select("*, team_members(*)")
    .eq("tournament_id", tournamentId)
    .order("created_at", { ascending: true });

  if (teamsError) {
    console.error("Teams error", teamsError);
  }

  return (
    <div className="p-6 md:p-8 space-y-6 min-h-full">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Participants</h1>
        <p className="text-slate-400">Gérez les équipes inscrites et leur statut de check-in.</p>
      </div>

      <ParticipantsClient 
        tournamentId={tournamentId} 
        guildId={guildId} 
        initialTeams={teams || []} 
      />
    </div>
  );
}