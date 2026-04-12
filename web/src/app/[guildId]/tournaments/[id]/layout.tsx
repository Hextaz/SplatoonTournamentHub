import { supabase } from "@/lib/supabase";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { PublicTournamentNav } from "@/components/PublicTournamentNav";

export default async function PublicTournamentLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ guildId: string; id: string }>;
}) {
  const { guildId, id } = await params;

  // Fetch only what's needed for the layout (banner, logo, title)
  const { data: tournament } = await supabase
    .from("tournaments")
    .select("name, description, start_at")
    .eq("id", id)
    .single();

  if (!tournament) {
    return (
      <div className="min-h-screen p-8 text-center text-slate-400 bg-[#0f111a]">
        <p className="text-xl">Tournoi introuvable.</p>
        <Link href={`/${guildId}`} className="text-blue-500 hover:text-blue-400 mt-4 inline-block">
          Retour aux tournois du serveur
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f111a] text-slate-200 flex flex-col font-sans">
      {/* Top Banner (Header area) */}
      <div className="relative">
        {/* Placeholder banner (Splatoon style/Toornament placeholder) */}
        <div className="w-full h-48 sm:h-64 bg-slate-800 relative shadow-inner overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-t from-[#0f111a]/80 to-transparent"></div>
          {/* A potential CSS pattern or image here - empty for now */}
          <div className="absolute top-4 left-4 z-10">
            <Link 
              href={`/${guildId}`}
              className="p-2 flex items-center justify-center rounded-full bg-black/40 hover:bg-black/60 text-white backdrop-blur-md transition-colors"
              title="Retour aux tournois du serveur"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
          </div>
        </div>
        
        {/* Profile Info Overlay */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 -mt-16 sm:-mt-20">
          <div className="flex flex-col sm:flex-row items-center sm:items-end sm:space-x-6">
            <div className="relative">
              <div className="w-24 h-24 sm:w-32 sm:h-32 bg-slate-900 border-4 border-[#0f111a] overflow-hidden rounded-xl shadow-lg flex items-center justify-center shrink-0">
                 {/* Profile picture. Fallback to nice gradient/icon */}
                 <div className="w-full h-full bg-gradient-to-br from-purple-600 via-blue-600 to-cyan-500 flex items-center justify-center">
                    <span className="text-3xl sm:text-5xl font-extrabold text-white opacity-40">
                      {tournament.name?.[0]?.toUpperCase() || "T"}
                    </span>
                 </div>
              </div>
            </div>
            
            <div className="mt-4 sm:mt-0 pb-2 sm:pb-3 flex-grow text-center sm:text-left">
              <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
                {tournament.name}
              </h1>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 sm:mt-8">
        <PublicTournamentNav guildId={guildId} tournamentId={id} />
      </div>

      {/* Main Content Area */}
      <main className="flex-grow pt-8 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {children}
        </div>
      </main>
    </div>
  );
}
