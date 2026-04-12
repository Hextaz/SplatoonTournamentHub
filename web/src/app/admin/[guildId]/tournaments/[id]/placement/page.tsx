import { supabase } from "@/lib/supabase";
import { notFound } from "next/navigation";
import { PlacementOverviewClient } from "./PlacementOverviewClient";

export default async function PlacementPage({
  params
}: {
  params: Promise<{ guildId: string; id: string }>;
}) {
  const { guildId, id: tournamentId } = await params;

  // Retrieve tournament
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
    .order("phase_order", { ascending: true });

  const currentPhases = phases || [];

  return (
    <div className="p-6 md:p-8 space-y-6 min-h-full flex flex-col">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Placement</h1>
        <p className="text-slate-400">
          Sélectionnez une phase pour y répartir vos équipes (seeding).
        </p>
      </header>

      <PlacementOverviewClient 
        tournamentId={tournamentId} 
        guildId={guildId} 
        initialPhases={currentPhases} 
      />
    </div>
  );
}
