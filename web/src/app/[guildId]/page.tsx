import { supabase } from "@/lib/supabase";
import { Trophy, Calendar, Settings } from "lucide-react";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

// Next.js 15: params is a Promise
export default async function GuildHubPage({
  params,
}: {
  params: Promise<{ guildId: string }>;
}) {
  const { guildId } = await params;

  // Verification if the user is a Discord Admin for this Guild
  const session = await getServerSession(authOptions);
  let isAdmin = false;

  if (session && (session as any).accessToken) {
    try {
      const res = await fetch("https://discord.com/api/users/@me/guilds", {
        headers: { Authorization: `Bearer ${(session as any).accessToken}` },
        next: { revalidate: 60 },
      });
      if (res.ok) {
        const guilds = await res.json();
        const guild = guilds.find((g: any) => g.id === guildId);
        // ADMINISTRATOR permission is 0x8 (bitmask 8)
        if (
          guild &&
          (BigInt(guild.permissions) & BigInt(0x8)) === BigInt(0x8)
        ) {
          isAdmin = true;
        }
      }
    } catch (e) {
      console.error("Failed to check Discord permissions", e);
    }
  }

  // Fetch tournaments for this guild
  const { data: tournaments, error } = await supabase
    .from("tournaments")
    .select("*")
    .eq("guild_id", guildId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching tournaments:", error);
    return (
      <div className="p-8 text-red-500">
        Erreur lors du chargement des tournois.
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#0f111a] text-slate-200 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <h1 className="text-4xl font-extrabold flex items-center gap-4 text-white">
            <Trophy className="w-10 h-10 text-yellow-500" />
            Tournois du Serveur
          </h1>

          {isAdmin && (
            <Link
              href={`/admin/${guildId}`}
              className="bg-[#151722] hover:bg-[#1a1d2d] transition-colors border border-slate-800/50 text-white px-6 py-3 rounded-lg font-bold flex items-center gap-3 shadow-lg"
            >
              <Settings className="w-5 h-5 text-slate-300" />
              Panel d'Administration
            </Link>
          )}
        </div>

        {tournaments?.length === 0 ? (
          <p className="text-slate-400">
            Aucun tournoi trouvé pour ce serveur.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tournaments?.map((t) => (
              <Link key={t.id} href={`/${guildId}/tournaments/${t.id}`}>
                <div className="bg-[#151722] border border-slate-800/50 p-6 rounded-xl hover:border-slate-700 transition-colors cursor-pointer group h-full flex flex-col">
                  <h2 className="text-2xl font-bold mb-2 text-white group-hover:text-blue-400 transition-colors">
                    {t.name}
                  </h2>
                  <p className="text-slate-400 mb-4 flex-grow line-clamp-3">
                    {t.description || "Aucune description fournie."}
                  </p>
                  <div className="flex items-center text-sm text-slate-500 mt-auto">
                    <Calendar className="w-4 h-4 mr-2" />
                    {t.start_date
                      ? new Intl.DateTimeFormat("fr-FR", {
                          dateStyle: "long",
                        }).format(new Date(t.start_date))
                      : "Date non définie"}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
