import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { supabaseAdmin } from "@/lib/supabase-admin";
import Link from "next/link";
import { ServerSidebarWrapper } from "@/components/ServerSidebarWrapper";
import { AdminSidebarNav } from "@/components/AdminSidebarNav";

export default async function AdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ guildId: string }>;
}) {
  const { guildId } = await params;
  const session = await getServerSession(authOptions);

  if (!session || !(session as any).accessToken) {
    redirect("/");
  }

  let isAdmin = false;
  try {
    const discordId = (session.user as any)?.id;
    const botApiUrl = process.env.NEXT_PUBLIC_BOT_API_URL || "http://localhost:8080";
    const botApiSecret = process.env.BOT_API_SECRET;

    console.log("[AdminLayout Check]", {
      guildId,
      discordId,
      user: session.user,
      hasAccessToken: !!(session as any).accessToken
    });

    if (discordId) {
      // 1. Check primary truth source: guild_admins table in Supabase via Admin Client
      const { data: adminRecord, error: dbError } = await supabaseAdmin
        .from("guild_admins")
        .select("discord_id")
        .eq("guild_id", guildId)
        .eq("discord_id", discordId)
        .maybeSingle();

      console.log("[AdminLayout DB Check]", { guildId, discordId, adminRecord, dbError });

      if (adminRecord) {
        isAdmin = true;
      } else {
        // 2. Fallback: query Discord bot live permissions endpoint
        const { data: serverSettings } = await supabaseAdmin
          .from("server_settings")
          .select("to_role_id")
          .eq("guild_id", guildId)
          .single();
        const toRoleId = serverSettings?.to_role_id || "";

        const headers: Record<string, string> = {};
        if (botApiSecret) {
          headers["Authorization"] = `Bearer ${botApiSecret}`;
        }

        const permRes = await fetch(
          `${botApiUrl}/api/discord/permissions?guildId=${guildId}&userId=${discordId}&toRoleId=${toRoleId}`,
          { headers, cache: "no-store" }
        );

        if (permRes.ok) {
          const permData = await permRes.json();
          console.log("[AdminLayout Bot Result]", permData);
          if (permData.hasPermission) {
            isAdmin = true;
          }
        } else {
          console.log("[AdminLayout Bot Fetch Failed]", permRes.status, await permRes.text().catch(() => ""));
        }
      }
    }
  } catch (e) {
    console.error("Error validating admin role:", e);
  }

  console.log("[AdminLayout Final]", { isAdmin, guildId });

  if (!isAdmin) {
    // If you don't have the permission, get redirected to the public hub
    redirect(`/${guildId}`);
  }

  return (
    <div className="flex flex-col lg:flex-row min-h-[calc(100vh-4rem)] bg-slate-900 text-white relative">
      {/* Sidebar Server conditionally rendered */}
      <ServerSidebarWrapper>
        <AdminSidebarNav guildId={guildId} />
      </ServerSidebarWrapper>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto flex flex-col">
        {children}
      </main>
    </div>
  );
}


