import { supabase } from "@/lib/supabase";
import { notFound } from "next/navigation";
import { SettingsClient } from "./SettingsClient";

export default async function TournamentSettingsPage({
  params
}: {
  params: Promise<{ guildId: string; id: string }>;
}) {
  const { guildId, id: tournamentId } = await params;

  const { data: tournament, error } = await supabase
    .from("tournaments")
    .select("*")
    .eq("id", tournamentId)
    .single();

  if (error || !tournament) notFound();

  return <SettingsClient tournament={tournament} guildId={guildId} />;
}
