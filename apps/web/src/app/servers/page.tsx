import { getServerSession } from "next-auth";
import { authOptions } from "../api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { Trophy } from "lucide-react";
import { cookies } from "next/headers";
import { t } from "@/i18n";
import { Locale } from "@/i18n/types";

interface DiscordGuild {
  id: string;
  name: string;
  icon: string | null;
  owner: boolean;
  permissions: number;
}

export default async function ServersPage() {
  const session = await getServerSession(authOptions);
  const cookieStore = await cookies();
  const locale = (cookieStore.get("NEXT_LOCALE")?.value as Locale) || "fr";

  if (!session || !(session as any).accessToken) {
    redirect("/");
  }

  // 1. Récupérer les guildes depuis Discord (nécessite le scope 'guilds')
  const discordRes = await fetch("https://discord.com/api/users/@me/guilds", {
    headers: {
      Authorization: `Bearer ${(session as any).accessToken}`,
    },
    next: { revalidate: 60 }, // Cache d'une minute
  });

  if (!discordRes.ok) {
    return (
      <div className="p-8 text-center text-red-500 font-medium bg-red-50 border border-red-200 mt-12 rounded-xl">
        <p>
          {t(locale, "servers.sessionExpired")}
        </p>
        <Link href="/" className="mt-4 block underline text-red-700">
          {t(locale, "servers.backToHome")}
        </Link>
      </div>
    );
  }

  const userGuilds: DiscordGuild[] = await discordRes.json();

  // 2. Récupérer les serveurs configurés côté Bot (Supabase)
  const { data: serverSettings, error } = await supabase
    .from("server_settings")
    .select("guild_id");

  if (error) {
    console.error("Database Error:", error);
  }

  const configuredGuildIds = (serverSettings || []).map((s) => s.guild_id);

  // 3. Matcher les deux : Serveurs du joueur OÙ le bot est aussi déployé
  const matchedGuilds = userGuilds.filter((g) =>
    configuredGuildIds.includes(g.id),
  );

  return (
    <div className="w-full min-h-[calc(100vh-4rem)] bg-[#0a0a0f] p-8 pt-12 text-slate-200">
      <div className="mb-10">
        <h1 className="text-4xl font-extrabold text-white tracking-tight">
          {t(locale, "servers.title")}
        </h1>
        <p className="text-slate-400 mt-3 text-lg max-w-2xl">
          {t(locale, "servers.subtitle")}
        </p>
      </div>

      {matchedGuilds.length === 0 ? (
        <div className="bg-[#151722] p-12 text-center rounded-2xl shadow-sm border border-slate-800/50 max-w-xl mx-auto">
          <div className="bg-[#1a1d2d] border border-slate-800/50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-4xl">🤖</span>
          </div>
          <h2 className="text-2xl font-bold text-slate-200">
            {t(locale, "servers.noServersFound")}
          </h2>
          <p className="text-slate-400 mt-4 leading-relaxed">
            {t(locale, "servers.noServersDesc")}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {matchedGuilds.map((guild) => (
            <Link
              key={guild.id}
              href={`/${guild.id}`}
              className="group bg-[#151722] rounded-2xl shadow-sm border border-slate-800/50 overflow-hidden hover:shadow-xl transition-all hover:-translate-y-1 block"
            >
              <div className="h-28 bg-gradient-to-br from-blue-600 to-blue-800 relative">
                {/* Icône de guilde */}
                <div className="absolute -bottom-8 left-6">
                  {guild.icon ? (
                    <img
                      src={`https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png`}
                      alt={guild.name}
                      className="w-16 h-16 rounded-xl border-4 border-[#151722] shadow-sm object-cover bg-[#151722]"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-xl border-4 border-[#151722] bg-[#1a1d2d] flex items-center justify-center shadow-sm">
                      <span className="text-xl font-bold text-slate-300">
                        {guild.name.substring(0, 2).toUpperCase()}
                      </span>
                    </div>
                  )}
                </div>
              </div>
              <div className="pt-12 pb-6 px-6 flex-1 flex flex-col">
                <h3
                  className="font-bold text-xl text-slate-200 truncate"
                  title={guild.name}
                >
                  {guild.name}
                </h3>

                <div className="mt-3 flex items-center gap-2 text-sm text-slate-400 font-medium">
                  <Trophy size={16} className="text-amber-500" />
                  <span>{t(locale, "servers.managedTournaments")}</span>
                </div>
              </div>
              <div className="bg-[#0f111a] border-t border-slate-800/50 px-6 py-4 flex items-center justify-end group-hover:bg-[#1a1d2d] transition-colors">
                <span className="text-blue-500 font-semibold flex items-center gap-2">
                  {t(locale, "servers.access")}{" "}
                  <span className="group-hover:translate-x-1 transition-transform">
                    →
                  </span>
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

