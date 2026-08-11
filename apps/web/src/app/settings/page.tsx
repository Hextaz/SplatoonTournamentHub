import { supabase } from "@/lib/supabase";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { t } from "@/i18n";
import { Locale } from "@/i18n/types";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

export default async function SettingsPage() {
  const guildId = process.env.NEXT_PUBLIC_DISCORD_GUILD_ID || "NO_GUILD_CONFIGURED";
  const session = await getServerSession(authOptions);
  const discordId = (session?.user as any)?.id || "";
  const cookieStore = await cookies();
  const locale = (cookieStore.get("NEXT_LOCALE")?.value as Locale) || "fr";

  const botApiUrl = process.env.NEXT_PUBLIC_BOT_API_URL || "http://localhost:8080";
  const botApiSecret = process.env.BOT_API_SECRET;

  // 1. Fetch live discord roles & channels dynamically from the bot's Express backend API
  let roles: any[] = [];
  let channels: any[] = [];
  try {
    if (botApiSecret) {
      const headers: HeadersInit = {
        Authorization: `Bearer ${botApiSecret}`,
        "X-Discord-User-Id": discordId,
        "X-Guild-Id": guildId,
      };

      const rolesRes = await fetch(`${botApiUrl}/api/discord/roles?guildId=${guildId}`, { 
        headers,
        cache: "no-store" 
      });
      if (rolesRes.ok) roles = await rolesRes.json();
      
      const channelsRes = await fetch(`${botApiUrl}/api/discord/channels?guildId=${guildId}`, { 
        headers,
        cache: "no-store" 
      });
      if (channelsRes.ok) channels = await channelsRes.json();
    }
  } catch (error) {
    console.error("Bot API is unreachable. Is Express running?", error);
  }

  // 2. Fetch the current selected TO role, Captain role, and Checkin channel from Supabase
  const { data: currentSettings } = await supabase
    .from("server_settings")
    .select("to_role_id, captain_role_id, checkin_channel_id")
    .eq("guild_id", guildId)
    .single();

  const currentToRoleId = currentSettings?.to_role_id || "";
  const currentCaptainRoleId = currentSettings?.captain_role_id || "";
  const currentCheckinChannelId = currentSettings?.checkin_channel_id || "";

  interface AutoSetupResponse {
    message: string;
    captain_role_id?: string;
    checkin_channel_id?: string;
    error?: string;
  }

  // 3. Server Actions
  async function saveRole(formData: FormData) {
    "use server";
    const serverGuildId = process.env.NEXT_PUBLIC_DISCORD_GUILD_ID || "";
    const selectedToRoleId = formData.get("roleId") as string;
    const selectedCaptainRoleId = formData.get("captainRoleId") as string;
    const selectedCheckinChannelId = formData.get("checkinChannelId") as string;
    
    await supabase.from("server_settings").upsert({
      guild_id: serverGuildId,
      to_role_id: selectedToRoleId,
      captain_role_id: selectedCaptainRoleId,
      checkin_channel_id: selectedCheckinChannelId,
    });

    revalidatePath("/settings");
  }

  async function triggerAutoSetup() {
    "use server";
    try {
      const serverGuildId = process.env.NEXT_PUBLIC_DISCORD_GUILD_ID || "";
      const actionSession = await getServerSession(authOptions);
      const actionDiscordId = (actionSession?.user as any)?.id || "";
      const actionBotApiSecret = process.env.BOT_API_SECRET;

      if (!actionBotApiSecret) {
        throw new Error("BOT_API_SECRET missing");
      }

      const res = await fetch(`${botApiUrl}/api/discord/auto-setup?guildId=${serverGuildId}`, { 
        method: "POST",
        headers: {
          Authorization: `Bearer ${actionBotApiSecret}`,
          "X-Discord-User-Id": actionDiscordId,
          "X-Guild-Id": serverGuildId,
        }
      });
      const data = (await res.json()) as AutoSetupResponse;
      
      if (res.ok && data.captain_role_id && data.checkin_channel_id) {
        await supabase.from("server_settings").upsert({
          guild_id: serverGuildId,
          captain_role_id: data.captain_role_id,
          checkin_channel_id: data.checkin_channel_id,
        });
        revalidatePath("/settings");
      }
    } catch (e) {
      console.error(e);
    }
  }

  return (
    <div className="w-full min-h-[calc(100vh-4rem)] p-8 bg-[#0a0a0f] text-slate-200 flex items-center justify-center">
      <div className="bg-[#151722] p-8 rounded-2xl border border-slate-800 shadow-2xl w-full max-w-2xl">
        <div className="flex justify-between items-center mb-2 border-b border-slate-800 pb-4">
          <h1 className="text-2xl font-bold text-white">
            {t(locale, "settings.title")}
          </h1>
          <form action={triggerAutoSetup}>
            <button 
              type="submit" 
              className="bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold py-2 px-4 rounded-lg shadow transition-colors"
            >
              {t(locale, "settings.autoCreateBot")}
            </button>
          </form>
        </div>

        {/* Interface Language Preference */}
        <div className="mb-6 p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-white">{t(locale, "settings.interfaceLanguage")}</h2>
            <p className="text-xs text-slate-400 mt-0.5">{t(locale, "settings.languageDesc")}</p>
          </div>
          <LanguageSwitcher />
        </div>
        
        <p className="text-slate-400 mb-6 text-sm">
          {t(locale, "settings.description")}
        </p>

        <form action={saveRole} className="flex flex-col gap-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-slate-300" htmlFor="roleId">
                {t(locale, "settings.toRole")}
              </label>
              <select
                id="roleId"
                name="roleId"
                defaultValue={currentToRoleId}
                className="p-3 border border-slate-700 bg-slate-900 rounded-lg text-slate-100 focus:border-blue-500 focus:outline-none"
              >
                <option value="" disabled>{t(locale, "settings.selectRole")}</option>
                {roles.map((r: any) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-slate-300" htmlFor="captainRoleId">
                {t(locale, "settings.captainRole")}
              </label>
              <select
                id="captainRoleId"
                name="captainRoleId"
                defaultValue={currentCaptainRoleId}
                className="p-3 border border-slate-700 bg-slate-900 rounded-lg text-slate-100 focus:border-blue-500 focus:outline-none"
              >
                <option value="">({t(locale, "common.none")})</option>
                {roles.map((r: any) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-2 md:col-span-2">
              <label className="text-sm font-semibold text-slate-300" htmlFor="checkinChannelId">
                {t(locale, "settings.checkinChannel")}
              </label>
              <select
                id="checkinChannelId"
                name="checkinChannelId"
                defaultValue={currentCheckinChannelId}
                className="p-3 border border-slate-700 bg-slate-900 rounded-lg text-slate-100 focus:border-blue-500 focus:outline-none"
              >
                <option value="">({t(locale, "common.none")})</option>
                {channels.map((c: any) => (
                  <option key={c.id} value={c.id}>#{c.name}</option>
                ))}
              </select>
            </div>
          </div>
          
          <button
            type="submit"
            className="mt-4 w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-4 rounded-lg transition-colors"
          >
            {t(locale, "settings.saveSettings")}
          </button>
        </form>
      </div>
    </div>
  );
}

