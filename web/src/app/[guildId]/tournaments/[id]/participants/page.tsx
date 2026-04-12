import { supabase } from "@/lib/supabase";
import { ParticipantsClientView } from "./ParticipantsClientView";

export default async function PublicParticipantsPage({
  params,
}: {
  params: Promise<{ guildId: string; id: string }>;
}) {
  const { id } = await params;

  // Fetch all checked-in teams for the tournament
  const { data: teams } = await supabase
    .from("teams")
    .select("*")
    .eq("tournament_id", id)
    .eq("is_checked_in", true)
    .order("created_at", { ascending: true });

  if (!teams || teams.length === 0) {
    return (
      <div className="py-12 bg-[#151722] rounded-xl border border-slate-800/50 flex flex-col items-center justify-center text-slate-500 animate-in fade-in duration-300">
        <p>Aucun participant n'est encore validé pour ce tournoi.</p>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in duration-300">
      <ParticipantsClientView teams={teams} />
    </div>
  );
}
