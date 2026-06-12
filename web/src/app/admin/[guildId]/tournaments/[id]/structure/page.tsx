import { supabase } from "@/lib/supabase";
import { notFound } from "next/navigation";
import { StructureClient } from "./StructureClient";

export const dynamic = 'force-dynamic';

export default async function TournamentStructurePage({
  params,
}: {
  params: Promise<{ guildId: string; id: string }>;
}) {
  const { guildId, id: tournamentId } = await params;

  // Verify tournament and retrieve info
  const { data: tournament, error: tErr } = await supabase
    .from("tournaments")
    .select("id, status")
    .eq("id", tournamentId)
    .single();

  if (tErr || !tournament) {
    notFound();
  }

  // Fetch existing phases for this tournament
  const { data: phases, error: pErr } = await supabase
    .from("phases")
    .select("*")
    .eq("tournament_id", tournamentId)
    .order("created_at", { ascending: true });

  const currentPhases = phases || [];

  return (
    <div className="p-6 md:p-8 space-y-6 min-h-full">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Structure du Tournoi</h1>
        <p className="text-slate-400">
          Gérez les phases (arbres de parcours, poules) de votre événement. 
          Commencez par définir le format global.
        </p>
      </header>

      <StructureClient 
        tournamentId={tournamentId} 
        guildId={guildId} 
        initialPhases={currentPhases} 
      />
    </div>
  );
}