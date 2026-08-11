import { supabase } from "@/lib/supabase";
import { Trophy, CheckCircle } from "lucide-react";
import { cookies } from "next/headers";
import { t } from "@/i18n";
import { Locale } from "@/i18n/types";

export default async function AdminDashboard({
  params,
}: {
  params: Promise<{ guildId: string }>;
}) {
  const { guildId } = await params;
  const cookieStore = await cookies();
  const locale = (cookieStore.get("NEXT_LOCALE")?.value as Locale) || "fr";

  // Exemples de requêtes pour le status global (Dashboard)
  const [
    { count: tournamentsCount },
    { count: activeTournamentsCount },
    { data: settings }
  ] = await Promise.all([
    supabase.from("tournaments").select("*", { count: "exact", head: true }).eq("guild_id", guildId),
    supabase.from("tournaments").select("*", { count: "exact", head: true }).eq("guild_id", guildId).eq("status", "in_progress"),
    supabase.from("server_settings").select("*").eq("guild_id", guildId).single()
  ]);

  return (
    <div className="p-6 md:p-8 w-full max-w-[1600px] mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">{t(locale, "admin.dashboardTitle")}</h1>
        <p className="text-slate-400">{t(locale, "admin.dashboardSubtitle")}</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-md flex items-center justify-between">
          <div>
            <p className="text-slate-400 text-sm mb-1 uppercase tracking-wider">{t(locale, "admin.totalTournaments")}</p>
            <p className="text-3xl font-extrabold text-white">{tournamentsCount || 0}</p>
          </div>
          <div className="p-3 bg-blue-500/10 rounded-xl">
            <Trophy className="w-8 h-8 text-blue-400" />
          </div>
        </div>

        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-md flex items-center justify-between">
          <div>
            <p className="text-slate-400 text-sm mb-1 uppercase tracking-wider">{t(locale, "admin.inProgress")}</p>
            <p className="text-3xl font-extrabold text-green-400">{activeTournamentsCount || 0}</p>
          </div>
          <div className="p-3 bg-green-500/10 rounded-xl">
            <CheckCircle className="w-8 h-8 text-green-400" />
          </div>
        </div>

        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-md flex justify-between items-center">
          <div>
            <p className="text-slate-400 text-sm mb-1 uppercase tracking-wider">{t(locale, "admin.serverConfigured")}</p>
            <p className="text-xl font-bold mt-1">
              {settings ? (
                <span className="text-green-400 flex items-center gap-2"><CheckCircle className="w-5 h-5"/> {t(locale, "admin.yesConfigured")}</span>
              ) : (
                <span className="text-yellow-500">{t(locale, "admin.notFinished")}</span>
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}


