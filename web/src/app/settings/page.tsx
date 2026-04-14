import { supabase } from "@/lib/supabase";
import { getBotApiUrl } from '@/utils/api';

import { revalidatePath } from "next/cache";

export default async function SettingsPage() {
  const guildId = process.env.NEXT_PUBLIC_DISCORD_GUILD_ID || "NO_GUILD_CONFIGURED";

  // 1. Fetch live discord roles & channels dynamically from the bot's Express backend API
  let roles: any[] = [];
  let channels: any[] = [];
  try {
    const rolesRes = await fetch(`${getBotApiUrl()}/api/discord/roles?guildId=${guildId}`, { cache: "no-store" });
    if (rolesRes.ok) roles = await rolesRes.json();
    
    const channelsRes = await fetch(`${getBotApiUrl()}/api/discord/channels?guildId=${guildId}`, { cache: "no-store" });
    if (channelsRes.ok) channels = await channelsRes.json();
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
      const res = await fetch(`${getBotApiUrl()}/api/discord/auto-setup?guildId=${process.env.NEXT_PUBLIC_DISCORD_GUILD_ID || ""}`, { 
        method: "POST" 
      });
      const data = (await res.json()) as AutoSetupResponse;
      
      if (res.ok && data.captain_role_id && data.checkin_channel_id) {
        const serverGuildId = process.env.NEXT_PUBLIC_DISCORD_GUILD_ID || "";
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
    <div className="min-h-screen p-8 bg-gray-50 flex items-center justify-center">
      <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-2xl">
        <div className="flex justify-between items-center mb-2 border-b pb-4">
          <h1 className="text-2xl font-bold text-gray-800">
            Tournament Settings
          </h1>
          <form action={triggerAutoSetup}>
            <button 
              type="submit" 
              className="bg-green-600 hover:bg-green-700 text-white text-sm font-semibold py-2 px-4 rounded-lg shadow"
            >
              ✨ Créer automatiquement via le Bot
            </button>
          </form>
        </div>
        
        <p className="text-gray-500 mb-6 text-sm">
          Select the live Discord roles and channels to use for your server&apos;s tournament configuration. 
          The bot uses these to restrict access and route players correctly.
        </p>

        <form action={saveRole} className="flex flex-col gap-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-gray-700" htmlFor="roleId">
                TO Role (Admins)
              </label>
              <select
                id="roleId"
                name="roleId"
                defaultValue={currentToRoleId}
                className="p-3 border border-gray-300 rounded-lg text-gray-800"
              >
                <option value="" disabled>-- Select a Discord Role --</option>
                {roles.map((r: any) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-gray-700" htmlFor="captainRoleId">
                Capitaine Role
              </label>
              <select
                id="captainRoleId"
                name="captainRoleId"
                defaultValue={currentCaptainRoleId}
                className="p-3 border border-gray-300 rounded-lg text-gray-800"
              >
                <option value="">(None)</option>
                {roles.map((r: any) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-2 md:col-span-2">
              <label className="text-sm font-semibold text-gray-700" htmlFor="checkinChannelId">
                Check-in Channel
              </label>
              <select
                id="checkinChannelId"
                name="checkinChannelId"
                defaultValue={currentCheckinChannelId}
                className="p-3 border border-gray-300 rounded-lg text-gray-800"
              >
                <option value="">(None)</option>
                {channels.map((c: any) => (
                  <option key={c.id} value={c.id}>#{c.name}</option>
                ))}
              </select>
            </div>
          </div>
          
          <button
            type="submit"
            className="mt-4 w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-lg"
          >
            Save Settings
          </button>
        </form>
      </div>
    </div>
  );
}
